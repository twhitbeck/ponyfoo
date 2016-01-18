'use strict';

var $ = require('dominus');
var taunus = require('taunus');
var concurrent = require('contra/concurrent');
var loadScript = require('../../lib/loadScript');
var env = require('../../lib/env');
var mapsKey = env('GOOGLE_MAPS_API_KEY');
var source = 'https://maps.googleapis.com/maps/api/js?key=' + mapsKey + '&libraries=places';
var nullLatLng = {
  lat: 0, lng: 0
};

module.exports = function (viewModel, container) {
  loadScript(source, function () {
    var gmaps = google.maps;
    var interactButton = $('.tkfm-interact');
    var interactiveMap = $('.tkfm-interactive');
    var interactiveMapEl = interactiveMap[0];
    var mapOptions = {
      center: nullLatLng,
      zoom: 2
    };
    var map = new gmaps.Map(interactiveMapEl, mapOptions);
    var places = new gmaps.places.PlacesService(map);
    var toPink = markMapper('/img/map-pin-e92c6c.png'); // from http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=+|e92c6c
    var toPinkLight = markMapper('/img/map-pin-f4a5c0.png'); // from http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=+|f4a5c0
    var upcoming = viewModel.engagements.upcoming.map(toPink);
    var past = viewModel.engagements.past.map(toPinkLight);
    var all = upcoming.concat(past);

    concurrent(all, 4, ready);

    function ready () {
      interactButton.removeClass('uv-hidden').on('click', interact);
    }
    function interact () {
      interactButton.addClass('tkfm-interact-fadeout');
      interactiveMap.addClass('tkfm-interactive-fadein');
      setTimeout(showInteractiveMap, 1000);
      function showInteractiveMap () {
        interactButton.remove();
      }
    }

    function markMapper (icon) {
      return function (engagement) {
        return function (next) {
          markPlace(icon, engagement, next);
        };
      };
    }
    function markPlace (icon, engagement, next) {
      places.textSearch({ query: engagement.location }, foundPlace);
      function foundPlace (results, status) {
        if (status === gmaps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
          setTimeout(retry, 1000);
          return;
        }
        if (status !== gmaps.places.PlacesServiceStatus.OK) {
          console.error(status, results);
          next();
          return;
        }
        var place = results[0];
        if (place) {
          createMarker(place);
        }
        next();
        function retry () {
          markPlace(icon, engagement, next);
        }
        function createMarker (place) {
          var partial = taunus.state.templates['speaking/engagement-infowindow'];
          var infoWindow = new google.maps.InfoWindow({
            content: partial({ engagement: engagement })
          });
          var marker = new gmaps.Marker({
            map: map,
            position: place.geometry.location,
            title: engagement.conference,
            icon: icon
          });
          gmaps.event.addListener(marker, 'click', reveal);
          function reveal () {
            infoWindow.open(map, marker);
          }
        }
      }
    }
  });
};
