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

没想到记录个日志坑这么多，主要参考 `org.springframework.cloud.gateway.filter.factory.rewrite.ModifyRequestBodyGatewayFilterFactory` 解决 Request Body 只能消费一次问题；DataBufferFactory 解决响应体分段传输问题。

参照此思路也可实现加密解密等其他需求。

```java
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.reactivestreams.Publisher;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.factory.rewrite.CachedBodyOutputMessage;
import org.springframework.cloud.gateway.support.BodyInserterContext;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.HttpMessageReader;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.web.reactive.function.BodyInserter;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.server.HandlerStrategies;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;

/**
 * 访问日志全局过滤器
 *
 * @author Richard
 * @date 2020.03.02
 */
@Configuration
@ConditionalOnProperty(value = "gateway.log.enable", matchIfMissing = true)
@Slf4j
public class AccessLoggingFilter implements GlobalFilter, Ordered {

	private static final LogLevel LEVEL = LogLevel.BASIC;

	public static final int ACCESS_LOGGING_FILTER_ORDER = Ordered.HIGHEST_PRECEDENCE;

	private static final String REQUEST_PREFIX = "Request Info: { ";

	private static final String REQUEST_TAIL = " }; ";

	private static final String RESPONSE_PREFIX = "Response Info: { ";

	private static final String RESPONSE_TAIL = " }";

	private final List<HttpMessageReader<?>> messageReaders = HandlerStrategies.withDefaults().messageReaders();

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {

		boolean recordBody = shouldRecordReqBodyLog(exchange);

		if (recordBody) {
			// 记录 body 日志
			return recordBodyLog(exchange, chain);
		}

		// 记录基本日志
		return recordBasicLog(exchange, chain);
	}

	/**
	 * 是否记录 body log
	 *
	 * @param exchange
	 * @return 是，否
	 */
	private boolean shouldRecordReqBodyLog(ServerWebExchange exchange) {
		ServerHttpRequest request = exchange.getRequest();
		log.info("Request URL:{}", request.getURI());

		// 获取媒体类型，用于判断只记录普通类型日志，过滤如：上传文件类型，xml类型等。
		MediaType mediaType = request.getHeaders().getContentType();

		// json 或 表单提交打印详细日志
		boolean recordReqDetailLog = MediaType.APPLICATION_JSON.isCompatibleWith(mediaType)
				|| MediaType.APPLICATION_FORM_URLENCODED.isCompatibleWith(mediaType);

		return recordReqDetailLog && LogLevel.BODY == LEVEL;

	}

	/**
	 * 记录基本日志
	 *
	 * @param exchange
	 * @param chain
	 * @return
	 */
	private Mono<Void> recordBasicLog(ServerWebExchange exchange, GatewayFilterChain chain) {
		// 请求开始时间
		long startTime = System.currentTimeMillis();

		// 构造日志
		StringBuffer logMsg = new StringBuffer();

		// 记录请求日志
		recordRequestBasicLog(exchange, logMsg);

		// 添加结束请求日志标识
		logMsg.append(REQUEST_TAIL);

		// 记录响应日志
		ServerHttpResponseDecorator decoratedResponse = recordResponseLog(exchange, logMsg, startTime);

		// 记录普通的
		return chain.filter(exchange.mutate().response(decoratedResponse).build())
				.then(Mono.fromRunnable(() -> {
					// 打印日志
					log.info(logMsg.toString());
				}));
	}

	/**
	 * 记录 body 日志
	 * 解决 request body 只能读取一次问题，参考: org.springframework.cloud.gateway.filter.factory.rewrite.ModifyRequestBodyGatewayFilterFactory
	 *
	 * @param exchange
	 * @param chain
	 * @return
	 */
	@SuppressWarnings("unchecked")
	private Mono<Void> recordBodyLog(ServerWebExchange exchange, GatewayFilterChain chain) {
		// 请求开始时间
		long startTime = System.currentTimeMillis();

		// 构造日志
		StringBuffer logMsg = new StringBuffer();

		// 记录请求日志
		recordRequestBasicLog(exchange, logMsg);

		// 读取请求体
		ServerRequest serverRequest = ServerRequest.create(exchange, messageReaders);
		Mono<String> modifiedBody = serverRequest.bodyToMono(String.class)
				// .log("modify_request_mono", Level.INFO)
				.flatMap(body -> {
					// 拼接记录body
					logMsg.append(",body=").append(body);

					// 添加结束请求日志标识
					logMsg.append(REQUEST_TAIL);
					return Mono.just(body);
				});

		// 通过 BodyInserter 插入 body(支持修改body), 避免 request body 只能获取一次
		BodyInserter bodyInserter = BodyInserters.fromPublisher(modifiedBody, String.class);
		HttpHeaders headers = new HttpHeaders();
		headers.putAll(exchange.getRequest().getHeaders());

		// the new content type will be computed by bodyInserter
		// and then set in the request decorator
		headers.remove(HttpHeaders.CONTENT_LENGTH);

		CachedBodyOutputMessage outputMessage = new CachedBodyOutputMessage(exchange, headers);
		return bodyInserter.insert(outputMessage, new BodyInserterContext())
//				 .log("modify_request", Level.INFO)
				.then(Mono.defer(() -> {
					// 重新封装请求
					ServerHttpRequest decorator = requestDecorate(exchange, headers, outputMessage);

					// 记录响应日志
					ServerHttpResponseDecorator decoratedResponse = recordResponseLog(exchange, logMsg, startTime);

					return chain.filter(exchange.mutate().request(decorator).response(decoratedResponse).build())
							.then(Mono.fromRunnable(() -> {
								// 打印日志
								log.info(logMsg.toString());
							}));
				}));
	}

	/**
	 * 记录请求基本日志
	 *
	 * @param exchange
	 * @param logMsg
	 * @return
	 */
	private void recordRequestBasicLog(ServerWebExchange exchange, StringBuffer logMsg) {
		ServerHttpRequest request = exchange.getRequest();
		InetSocketAddress address = request.getRemoteAddress();
		HttpHeaders headers = request.getHeaders();

		// 记录基本参数
		logMsg.append(REQUEST_PREFIX);
		logMsg.append("path=").append(request.getPath());
		logMsg.append(",method=").append(request.getMethodValue());
		logMsg.append(",header=").append(headers);
		logMsg.append(",address=").append(address.getHostName() + address.getPort());
	}

	/**
	 * 记录响应日志
	 * 通过 DataBufferFactory 解决响应体分段传输问题。
	 *
	 * @param exchange
	 * @param logMsg
	 * @param startTime
	 * @return
	 */
	private ServerHttpResponseDecorator recordResponseLog(ServerWebExchange exchange, StringBuffer logMsg, long startTime) {
		ServerHttpResponse response = exchange.getResponse();
		DataBufferFactory bufferFactory = response.bufferFactory();
		logMsg.append(RESPONSE_PREFIX);

		return new ServerHttpResponseDecorator(response) {
			@Override
			public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
				if (body instanceof Flux) {
					// 计算执行时间
					long executeTime = (System.currentTimeMillis() - startTime);

					// 获取响应类型，如果是 json 就打印
					String originalResponseContentType = exchange.getAttribute(ServerWebExchangeUtils.ORIGINAL_RESPONSE_CONTENT_TYPE_ATTR);
					if (LogLevel.BODY == LEVEL
							&& Objects.equals(this.getStatusCode(), HttpStatus.OK)
							&& StringUtils.isNotBlank(originalResponseContentType)
							&& originalResponseContentType.contains("application/json")) {
						Flux<? extends DataBuffer> fluxBody = Flux.from(body);
						return super.writeWith(fluxBody.buffer().map(dataBuffers -> {

							// 合并多个流集合，解决返回体分段传输
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
	}

	/**
	 * 请求装饰器，重新计算 headers
	 *
	 * @param exchange
	 * @param headers
	 * @param outputMessage
	 * @return
	 */
	private ServerHttpRequestDecorator requestDecorate(ServerWebExchange exchange, HttpHeaders headers,
													   CachedBodyOutputMessage outputMessage) {
		return new ServerHttpRequestDecorator(exchange.getRequest()) {
			@Override
			public HttpHeaders getHeaders() {
				long contentLength = headers.getContentLength();
				HttpHeaders httpHeaders = new HttpHeaders();
				httpHeaders.putAll(super.getHeaders());
				if (contentLength > 0) {
					httpHeaders.setContentLength(contentLength);
				} else {
					// TODO: this causes a 'HTTP/1.1 411 Length Required' // on
					// httpbin.org
					httpHeaders.set(HttpHeaders.TRANSFER_ENCODING, "chunked");
				}
				return httpHeaders;
			}

			@Override
			public Flux<DataBuffer> getBody() {
				return outputMessage.getBody();
			}
		};
	}

	/**
	 * 优先级默认设置为最高
	 */
	@Override
	public int getOrder() {
		return ACCESS_LOGGING_FILTER_ORDER;
	}

	/**
	 * 日志级别
	 */
	private enum LogLevel {
		BASIC,
		BODY;
	}
}
```

## 参考

- https://github.com/spring-cloud/spring-cloud-gateway/issues/47
