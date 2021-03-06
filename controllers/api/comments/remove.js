'use strict';

var contra = require('contra');
var assign = require('assignment');
var Article = require('../../../models/Article');
var WeeklyIssue = require('../../../models/WeeklyIssue');
var hostTypes = {
  articles: {
    name: 'Article',
    schema: Article,
    query: { status: 'published' },
    topic: 'articles'
  },
  weeklies: {
    name: 'Weekly issue',
    schema: WeeklyIssue,
    query: { status: 'released' },
    topic: 'newsletter'
  }
};

function remove (req, res, next) {
  var hostType = hostTypes[req.params.type];
  var id = req.params.id;

  contra.waterfall([lookup, found, removal], handle);

  function lookup (next) {
    hostType.schema
      .findOne(assign({ slug: req.params.slug }, hostType.query))
      .populate('comments')
      .exec(next);
  }

  function found (host, next) {
    var comment = host.comments.id(id);
    if (!comment) {
      res.status(404).json({ messages: ['Comment not found'] }); return;
    }
    next(null, host);
  }

  function removal (host, next) {
    var comment = host.comments.id(id);
    var children = host.comments.filter(sameThread);

    function sameThread (comment) {
      return comment.parent && comment.parent.equals(id);
    }

    [comment].concat(children).forEach(function removeAll (comment) {
      comment.remove();
    });

    host.save(saved);

    function saved (err) {
      next(err);
    }
  }

  function handle (err) {
    if (err) {
      next(err); return;
    }
    res.json({});
  }
}

module.exports = remove;
