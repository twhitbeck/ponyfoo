'use strict';

var $ = require('dominus');
var comments = require('../comments/all');

module.exports = function (viewModel, container) {
  if (viewModel.article.status !== 'published' || !viewModel.full) {
    return;
  }
  var composer = $('.mc-composer');
  var commentsModel = {
    user: viewModel.user,
    parent: viewModel.article,
    parentType: 'articles',
    measly: viewModel.measly.layer({
      context: composer[0]
    })
  };
  comments(commentsModel, container);
};
