'use strict';

var pullData = require('../lib/pullData');
var subscriberService = require('../../services/subscriber');

module.exports = function (req, res, next) {
  pullData(function render (err, result) {
    if (err) {
      next(err); return;
    }

    res.viewModel = {
      model: {
        title: 'Subscribe to Pony Foo!',
        subscriberGraph: result,
        topics: subscriberService.getTopics()
      }
    };
    next();
  });
};
