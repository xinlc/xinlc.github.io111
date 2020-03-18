---
title: Spring Cloud Gateway 之 请求响应日志打印过滤器
date: 2020-03-03 13:46:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

请求响应日志是在日常开发调试定位问题的重要手段之一，引入网关后一般我们会在网关做统一请求日志处理。

<!--more-->

## 干货

没想到记录个日志坑这么多，主要通过 ServerHttpRequestDecorator 解决 Request Body 只能消费一次问题；DataBufferFactory 解决响应体分段传输问题。

参照此思路也可实现加密解密等其他需求。

```java
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.reactivestreams.Publisher;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.NettyWriteResponseFilter;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.CharBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 访问日志全局过滤器
 *
 * @author Leo
 */
//@Component
@Configuration
@ConditionalOnProperty(value = "gateway.log.enable", matchIfMissing = true)
@Slf4j
public class AccessLoggingFilter implements GlobalFilter, Ordered {

	public static final int ACCESS_LOGGING_FILTER_ORDER = Ordered.HIGHEST_PRECEDENCE;
	// 在 NettyWriteResponseFilter之前
//	public static final int ACCESS_LOGGING_FILTER_ORDER = NettyWriteResponseFilter.WRITE_RESPONSE_FILTER_ORDER - 20;

	private static final String REQUEST_PREFIX = "Request Info: { ";

	private static final String REQUEST_TAIL = " }; ";

	private static final String RESPONSE_PREFIX = "Response Info: { ";

	private static final String RESPONSE_TAIL = " }";

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
		long startTime = System.currentTimeMillis();

		// 构造日志
		StringBuffer logMsg = new StringBuffer();

		// 记录请求日志
		RecorderServerHttpRequestDecorator requestDecorator = recordRequestLog(exchange, logMsg);

		// 记录响应日志
		ServerHttpResponseDecorator decoratedResponse = recordResponseLog(exchange, logMsg, startTime);

		return chain.filter(exchange.mutate().request(requestDecorator).response(decoratedResponse).build())
				.then(Mono.fromRunnable(() -> {
					// 打印日志
					log.info(logMsg.toString());
				}));

	}

	/**
	 * 记录请求日志
	 *
	 * @param exchange
	 * @param logMsg
	 * @return
	 */
	private RecorderServerHttpRequestDecorator recordRequestLog(ServerWebExchange exchange, StringBuffer logMsg) {
		ServerHttpRequest request = exchange.getRequest();
		MediaType mediaType = request.getHeaders().getContentType();

		RecorderServerHttpRequestDecorator requestDecorator = new RecorderServerHttpRequestDecorator(request);

		// json 或 表单提交打印详细日志
		boolean recordReqDetailLog = MediaType.APPLICATION_JSON.isCompatibleWith(mediaType)
				|| MediaType.APPLICATION_FORM_URLENCODED.isCompatibleWith(mediaType);

		if (recordReqDetailLog) {
			InetSocketAddress address = requestDecorator.getRemoteAddress();
			HttpMethod method = requestDecorator.getMethod();
			URI url = requestDecorator.getURI();
			HttpHeaders headers = requestDecorator.getHeaders();
			Flux<DataBuffer> body = requestDecorator.getBody();

			// 读取 requestBody 传参
			AtomicReference<String> requestBody = new AtomicReference<>("");
			body.subscribe(buffer -> {
				CharBuffer charBuffer = StandardCharsets.UTF_8.decode(buffer.asByteBuffer());
				// 释放掉内存
				DataBufferUtils.release(buffer);
				requestBody.set(charBuffer.toString());
			});

			String requestParams = requestBody.get();
			logMsg.append(REQUEST_PREFIX);
			logMsg.append("url=").append(url.getPath());
			logMsg.append(",method=").append(method.name());
			logMsg.append(",header=").append(headers);
			logMsg.append(",params=").append(requestParams);
//			normalMsg.append(",address:").append(address.getHostName() + address.getPort());
		} else {
			// 其他请求类型，比如：上传文件，只记录 url 即可
			logMsg.append(REQUEST_PREFIX);
			logMsg.append("url=").append(request.getPath());
			logMsg.append(",method=").append(request.getMethodValue());
			logMsg.append(",mediaType=").append(mediaType);
		}
		logMsg.append(REQUEST_TAIL);
		return requestDecorator;
	}

	/**
	 * 记录响应日志
	 *
	 * @param exchange
	 * @param logMsg
	 * @param startTime
	 * @return
	 */
	private ServerHttpResponseDecorator recordResponseLog(ServerWebExchange exchange, StringBuffer logMsg, long startTime) {
		ServerHttpResponse response = exchange.getResponse();
//		DataBufferFactory bufferFactory = response.bufferFactory();
		DataBufferFactory bufferFactory = response.bufferFactory();
		logMsg.append(RESPONSE_PREFIX);

		ServerHttpResponseDecorator decoratedResponse = new ServerHttpResponseDecorator(response) {
			@Override
			public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
				if (body instanceof Flux) {
					// 计算执行时间
					long executeTime = (System.currentTimeMillis() - startTime);

					// 获取响应类型，如果是 json 就打印
					String originalResponseContentType = exchange.getAttribute(ServerWebExchangeUtils.ORIGINAL_RESPONSE_CONTENT_TYPE_ATTR);
					if (Objects.equals(this.getStatusCode(), HttpStatus.OK)
							&& StringUtils.isNotBlank(originalResponseContentType)
							&& originalResponseContentType.contains("application/json")) {
						Flux<? extends DataBuffer> fluxBody = Flux.from(body);
						return super.writeWith(fluxBody.buffer().map(dataBuffers -> {

							// 合并多个流集合，解决响应体分段传输
							DataBufferFactory dataBufferFactory = new DefaultDataBufferFactory();
							DataBuffer join = dataBufferFactory.join(dataBuffers);
							byte[] content = new byte[join.readableByteCount()];
							join.read(content);

							// 释放掉内存
							DataBufferUtils.release(join);
							String responseResult = new String(content, StandardCharsets.UTF_8);

							// 构造响应日志
							logMsg.append("status=").append(this.getStatusCode());
							logMsg.append(",header=").append(this.getHeaders());
							logMsg.append(",responseResult=").append(responseResult);
							logMsg.append(",executeTime=").append(executeTime).append("ms");
							logMsg.append(RESPONSE_TAIL);

							return bufferFactory.wrap(content);
						}));
					} else {
						// 构造响应日志
						logMsg.append("status=").append(this.getStatusCode());
						logMsg.append(",header=").append(this.getHeaders());
						logMsg.append(",executeTime=").append(executeTime).append("ms");
						logMsg.append(RESPONSE_TAIL);
					}
				}
				// if body is not a flux. never got there.
				return super.writeWith(body);
			}
		};

		return decoratedResponse;
	}


	/**
	 * 优先级默认设置为最高
   *
   * @return int 数字越大优先级越低
	 */
	@Override
	public int getOrder() {
		return ACCESS_LOGGING_FILTER_ORDER;
	}

	/**
	 * 缓存请求参数，解决 body 只能读一次问题
	 */
	private static class RecorderServerHttpRequestDecorator extends ServerHttpRequestDecorator {

		private final List<DataBuffer> dataBuffers = new ArrayList<>();

		public RecorderServerHttpRequestDecorator(ServerHttpRequest delegate) {
			super(delegate);
			super.getBody().map(dataBuffer -> {
				dataBuffers.add(dataBuffer);
				return dataBuffer;
			}).subscribe();
		}

		@Override
		public Flux<DataBuffer> getBody() {
			return copy();
		}

		private Flux<DataBuffer> copy() {
			return Flux.fromIterable(dataBuffers)
					.map(buf -> buf.factory().wrap(buf.asByteBuffer()));
		}
	}

}

```

## 参考

- https://github.com/spring-cloud/spring-cloud-gateway/issues/47
