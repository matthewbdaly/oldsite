$(document).ready(function () {
    'use strict';
    
    // Set up search
    var index, store;
    $.getJSON('/lunr.json', function (response) {

        // Create index
        index = lunr.Index.load(response.index);

        // Create store
        store = response.store;

        // Handle search
        $('input#search').on('keyup', function () {
            // Get query
            var query = $(this).val();

            // Search for it
            var result = index.search(query);

            // Output it
            var resultdiv = $('ul.searchresults');
            if (result.length === 0) {
                // Hide results
                resultdiv.hide();
            } else {
                // Show results
                resultdiv.empty();
                for (var item in result) {
                    var ref = result[item].ref;
                    var searchitem = '<li><a href="' + ref + '">' + store[ref].title + '</a></li>';
                    resultdiv.append(searchitem);
                }
                resultdiv.show();
            }
        });
    });

    // Override search to work properly
    $('form#searchForm').on('submit', function (event) {
        // Prevent default behaviour
        event.preventDefault();

        // Get parameters
        var site, search;
        site = $('input#site').val();
        search = $('input#search').val();

        // Load the required page
        window.location = 'http://www.google.com/search?q=' + encodeURIComponent(site + ' ' + search);
    });
    
    // Get GitHub repos
    $.get('https://api.github.com/users/matthewbdaly/repos?type=owner', function (response) {
        var repolist = $('ul#github-repos');
        repolist.empty();
        for (var item in response) {
            // If repo is not a fork, display it
            if (!response[item].fork) {
                repolist.append('<li><a href="' + response[item].html_url + '">' + response[item].name + '</a><p>' + response[item].description + '</p></li>');
            }
        }

        // Get owner details from first item
        var profile = response[0].owner;

        // Insert them
        $('section#github-profile').append('<a id="github-image" href="' + profile.html_url + '" target="_blank"><img src="' + profile.avatar_url + '"></img></a>');
    });
    
});
