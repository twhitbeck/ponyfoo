'use strict';

var winston = require('winston');
var Article = require('../models/Article');
var es = require('../lib/elasticsearch');
var indexService = require('./articleElasticsearchIndex');
var indexName = 'ponyfoo';
var typeName = 'article';
var relatedArticlesLimit = 6;

function update (article, done) {
  es.client.update({
    index: indexName,
    type: typeName,
    id: article._id.toString(),
    body: {
      doc: indexService.toIndex(article),
      doc_as_upsert: true
    }
  }, done);
}

function query (input, options, done) {
  if (done === void 0) {
    done = options;
    options = {};
  }
  es.client.search({
    index: indexName,
    type: typeName,
    body: {
      query: {
        bool: {
          filter: filters(options),
          must: {
            multi_match: {
              query: input,
              fields: ['title^3', 'teaser', 'introduction', 'content']
            }
          }
        }
      }
    }
  }, found(done));
}

function related (article, options, done) {
  if (done === void 0) {
    done = options;
    options = {};
  }
  es.client.search({
    index: indexName,
    type: typeName,
    body: {
      query: {
        bool: {
          filter: filters(options),
          must: {
            more_like_this: { like: { _id: article._id.toString() } }
          }
        }
      },
      size: relatedArticlesLimit
    }
  }, found(done));
}

function found (done) {
  return function through (err, result) {
    if (err) {
      done(err); return;
    }
    done(null, result.hits.hits.map(searchHitToResult));
  };
}

function warn (err) {
  if (err) { winston.warn(err); }
}

function filters (options) {
  var tags = Array.isArray(options.tags) ? options.tags : [];
  var clauses = [status('published')].concat(tags.map(tagToFilter));
  if (options.since) {
    clauses.unshift(since(options.since));
  }
  return all(clauses);
}
function all (clauses) {
  return { bool: { must: clauses } };
}
function status (value) {
  return { term: { status: value } };
}
function since (date) {
  return { range: { created: { gte: date } } };
}

function searchHitToResult (hit) {
  return {
    _score: hit._score,
    _id: hit._id,
    title: hit._source.title,
    slug: hit._source.slug
  };
}

function tagToFilter (tag) {
  return { term: { tags: tag } };
}

module.exports = {
  ensureIndex: indexService.ensureIndex,
  query: indexService.ensureIndexThen(query),
  update: indexService.ensureIndexThen(update),
  related: indexService.ensureIndexThen(related)
};
