
```json
// PUT _template/test_template
{
  "index_patterns": [
    "test_index_*",
    "test_*"
  ],
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "max_result_window": 100000,
    "refresh_interval": "30s",
    "analysis": {
      "analyzer": {
        "default": {
          "type": "ik_max_word"
        },
        "default_search": {
          "type": "ik_smart"
        },

        "ik_index_analyzer": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": [
            "lowercase"
          ]
        },
        "ik_search_analyzer": {
          "type": "custom",
          "tokenizer": "ik_smart"
        },
        "ik_pinyin_full_index_analyzer": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": [
            "lowercase",
            "pinyin_full_filter"
          ]
        },
        "ik_pinyin_full_analyzer": {
          "type": "custom",
          "tokenizer": "ik_smart",
          "filter": [
            "lowercase",
            "pinyin_full_filter",
            "word_delimiter"
          ]
        },
        "ik_pinyin_simple_index_analyzer": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": [
            "pinyin_simple_filter",
            "lowercase"
          ]
        },
        "ngram_index_analyzer": {
          "type": "custom",
          "tokenizer": "keyword",
          "filter": [
            "edge_ngram_filter",
            "lowercase"
          ]
        },
        "ngram_search_analyzer": {
          "type": "custom",
          "tokenizer": "keyword",
          "filter": [
            "lowercase"
          ]
        },
        "pinyin_simple_index_analyzer": {
          "tokenizer": "keyword",
          "filter": [
            "pinyin_simple_filter",
            "edge_ngram_filter",
            "lowercase"
          ]
        },
        "pinyin_simple_search_analyzer": {
          "tokenizer": "keyword",
          "filter": [
            "pinyin_simple_filter",
            "lowercase"
          ]
        },
        "pinyin_full_index_analyzer": {
          "tokenizer": "keyword",
          "filter": [
            "pinyin_full_filter",
            "lowercase"
          ]
        },
        "pinyin_full_search_analyzer": {
          "tokenizer": "keyword",
          "filter": [
            "pinyin_full_filter",
            "lowercase"
          ]
        },
        "suggest_search": {
          "tokenizer": "suggest_py",
          "filter": [
            "lowercase",
            "unique"
          ]
        },
        "suggest": {
          "tokenizer": "suggest",
          "filter": [
            "lowercase",
            "unique",
            "pinyin_filter"
          ]
        },
        "autocomplete_search": {
          "tokenizer": "autocomplete_py",
          "filter": [
            "lowercase",
            "unique"
          ]
        },
        "autocomplete_analyzer": {
          "tokenizer": "keyword",
          "filter": [
            "pinyin_filter",
            "lowercase",
            "unique"
          ]
        }
      },

      "tokenizer": {
        "suggest": {
          "type": "edge_ngram",
          "min_gram": "2",
          "max_gram": "16"
        },
        "suggest_py": {
          "type": "pinyin",
          "lowercase": "true",
          "keep_joined_full_pinyin": "true",
          "keep_original": "true",
          "keep_first_letter": "true",
          "keep_separate_first_letter": "false",
          "limit_first_letter_length": "16",
          "keep_full_pinyin": "false",
          "keep_none_chinese": "false"
        },
        "autocomplete_py": {
          "type": "pinyin",
          "keep_joined_full_pinyin": "true",
          "keep_none_chinese_in_first_letter ": "true",
          "lowercase": "true",
          "none_chinese_pinyin_tokenize": "false",
          "keep_none_chinese_in_joined_full_pinyin": "true",
          "keep_original": "true",
          "keep_first_letter": "false",
          "keep_separate_first_letter": "false",
          "limit_first_letter_length": "16",
          "keep_full_pinyin": "false"
        }
      },

      "filter": {
        "length_filter": {
          "type": "length",
          "min": "2"
        },
        "edge_ngram_filter": {
          "type": "edge_ngram",
          "min_gram": "2",
          "max_gram": "50"
        },
        "pinyin_filter": {
          "type": "pinyin",
          "keep_first_letter": "true",
          "keep_joined_full_pinyin": "true",
          "keep_full_pinyin": "true",
          "keep_original": "true",
          "remove_duplicated_term": "true",
          "keep_separate_first_letter": "false",
          "limit_first_letter_length": "16",
          "lowercase": "true"
        },
        "pinyin_simple_filter": {
          "type": "pinyin",
          "keep_joined_full_pinyin": "false",
          "none_chinese_pinyin_tokenize": "false",
          "keep_first_letter": "true",
          "keep_separate_first_letter": "false",
          "keep_full_pinyin": "false",
          "keep_original": "false",
          "limit_first_letter_length": "16",
          "lowercase": "true"
        },
        "pinyin_full_filter": {
          "type": "pinyin",
          "keep_first_letter": "false",
          "keep_separate_first_letter": "false",
          "keep_joined_full_pinyin": "true",
          "keep_full_pinyin": "true",
          "none_chinese_pinyin_tokenize": "true",
          "keep_none_chinese": "false",
          "keep_original": "false",
          "limit_first_letter_length": "16",
          "lowercase": "true"
        }
      },
      "suggest": {
        "type": "edge_ngram",
        "min_gram": "2",
        "max_gram": "16"
      },
      "suggest_py": {
        "type": "pinyin",
        "lowercase": "true",
        "keep_joined_full_pinyin": "true",
        "keep_original": "true",
        "keep_first_letter": "true",
        "keep_separate_first_letter": "false",
        "limit_first_letter_length": "16",
        "keep_full_pinyin": "false",
        "keep_none_chinese": "false"
      },
      "autocomplete_py": {
        "type": "pinyin",
        "keep_joined_full_pinyin": "true",
        "keep_none_chinese_in_first_letter ": "true",
        "lowercase": "true",
        "none_chinese_pinyin_tokenize": "false",
        "keep_none_chinese_in_joined_full_pinyin": "true",
        "keep_original": "true",
        "keep_first_letter": "false",
        "keep_separate_first_letter": "false",
        "limit_first_letter_length": "16",
        "keep_full_pinyin": "false"
      }
    }
  },
  
  "mappings": {
    "dynamic": "false",
    "_meta": {
      "version_mapping": "1.0"
    },
    "properties": {
      "id": {
        "type": "keyword"
      },
      "id_long": {
        "type": "long"
      },
      "title": {
        "type": "keyword"
      },
      "content": {
        "analyzer": "ik_max_word",
        "type": "text",
        "index_options": "offsets",
        "fields": {
          "keyword": {
            "ignore_above": 256,
            "type": "keyword"
          }
        }
      },
      "available": {
        "type": "boolean"
      },
      "review": {
        "type": "nested",
        "properties": {
          "nickname": {
            "type": "text"
          },
          "text": {
            "type": "text"
          },
          "stars": {
            "type": "integer"
          }
        }
      },
      "publish_time": {
        "type": "date",
        "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
      },
      "expected_attendees": {
        "type": "integer_range"
      },
      "ip_addr": {
        "type": "ip"
      },
      "words": {
        "analyzer": "ngram_index_analyzer",
        "type": "text",
        "fields": {
          "SPY": {
            "type": "text",
            "analyzer": "pinyin_simple_index_analyzer"
          },
          "FPY": {
            "type": "text",
            "analyzer": "pinyin_full_index_analyzer"
          },
          "IKS": {
            "type": "text",
            "analyzer": "ik_index_analyzer"
          }
        }
      },
      "txt": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart",
        "index_options": "offsets"
      },
      "query": {
        "type": "percolator"
      },
      "suggest": {
        "type": "text",
        "analyzer": "suggest",
        "search_analyzer": "suggest_search"
      },
      "autocomplete": {
        "type": "completion",
        "analyzer": "autocomplete_analyzer",
        "search_analyzer": "autocomplete_search",
        "max_input_length": 16,
        "preserve_separators": false
      },
      "weight": {
        "type": "integer"
      },
      "count": {
        "type": "integer"
      }
    }
  }
}
```
