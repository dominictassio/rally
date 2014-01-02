var hash; // creates the hash variable to store the geohash in later on

/* ================ Code for geohashing ================ */
BITS = [16, 8, 4, 2, 1];

BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

function encodeGeoHash(latitude, longitude) {
    var is_even = 1;
    var i = 0;
    var lat = [];
    var lon = [];
    var bit = 0;
    var ch = 0;
    var precision = 12;
    geohash = "";

    lat[0] = -90.0;
    lat[1] = 90.0;
    lon[0] = -180.0;
    lon[1] = 180.0;

    while (geohash.length < precision) {
        if (is_even) {
            mid = (lon[0] + lon[1]) / 2;
            if (longitude > mid) {
                ch |= BITS[bit];
                lon[0] = mid;
            } else lon[1] = mid;
        } else {
            mid = (lat[0] + lat[1]) / 2;
            if (latitude > mid) {
                ch |= BITS[bit];
                lat[0] = mid;
            } else lat[1] = mid;
        }

        is_even = !is_even;

        if (bit < 4) bit++;
        else {
            geohash += BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }
    return geohash;
}

/* === Functions for getting getting location colors === */
function getLocation(hash) {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(showPosition);
    else alert("Geolocation is disabled");
}

function showPosition(position) {
    var latitude = parseInt(position.coords.latitude);
    var longitude = parseInt(position.coords.longitude);

    var hash = '' + CryptoJS.MD5(encodeGeoHash(latitude, longitude));

    for (var i = 0; i < 4; ++i) {
        var hashseg = hash.substring(6*i+4, 6*(i+1)+4),
            seg1 = parseInt(hashseg.substring(0, 2), 16),
            seg2 = parseInt(hashseg.substring(2, 4), 16),
            seg3 = parseInt(hashseg.substring(4, 6), 16);

        seg1 = parseInt((seg1 + 180) / 2).toString(16);
        seg2 = parseInt((seg2 + 180) / 2).toString(16);
        seg3 = parseInt((seg3 + 180) / 2).toString(16);

        if (seg1.length == 1) seg1 = '0' + seg1;
        if (seg2.length == 1) seg2 = '0' + seg2;
        if (seg3.length == 1) seg3 = '0' + seg3;

        $('#colors').append('<div class="one-forth col-xs-3" style="background: ' + '#' + seg1 + seg2 + seg3 + '; display: none;"></div>');
        $('#colors > div').fadeIn(600);
        if ($('#location').length !== 0)
            $('#location').val($('#location').val().replace('none', '') + '#' + seg1 + seg2 + seg3);
    }
}

/* ============ Gets the mongodb collection ============ */
Topics = new Meteor.Collection('topics');
Posts = new Meteor.Collection('posts');
Replies = new Meteor.Collection('replies');

/* ========== Accounts module config settings ========== */
Accounts.config({ sendVerificationEmail: true, forbidClientAccountCreation: false });

/* ============ Iron-Router config settings ============ */
Router.configure({
    layoutTemplate: 'layout'
});

/*  Is used to get the current user, useful server side  */
var getCurrentUsername = function () {
    return Meteor.user() &&
        Meteor.user().username;
};
/* = creats a shodown convert for markdown conversions = */
var converter = new Showdown.converter();

/* ======== Sets routes for the different urls ========= */
Router.map(function () {
    this.route('home', { // The home route
        path: '/',
        tempalte: 'home',
        data: {
            user: function () {
                return Meteor.user();
            },
            gravatar: function () {
                return 'http://secure.gravatar.com/avatar/' + CryptoJS.MD5(Meteor.user().emails[0].address) + '?s=300&d=identicon';
            },
            username: function () {
                return Meteor.user().username;
            },
            home: function () {
                return 'active';
            },
            latest: function() {
                return Posts.find({}, {sort: {time: -1}, limit: 20 }).fetch();
            },
            mine: function () {
                if (Meteor.user())
                    return Posts.find({ poster: Meteor.user().username }).fetch();
            }
        },
        load: function () {
            $('select').selectpicker();
            $('[data-toggle=tooltip]').tooltip();
            $('head').prepend('<link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">');
        }
    });

    this.route('make', { // Route for the post maker
        path: '/make',
        tempalte: 'make',
        data: {
            user: function () {
                return Meteor.user();
            },
            gravatar: function () {
                return 'http://secure.gravatar.com/avatar/' + CryptoJS.MD5(Meteor.user().emails[0].address) + '?s=300&d=identicon';
            },
            username: function () {
                return Meteor.user().username;
            }
        },
        load: function () {
            $('select').selectpicker();
            $('[data-toggle=tooltip]').tooltip();
            $('head').prepend('<link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">');
        }
    });

    this.route('random', {
        path: '/p/random',
        load: function () {
            window.location.assign('/p/' + Posts.find({}).fetch()[Math.round(Math.random() * Posts.find({}).fetch().length)]._id);
        }
    });

    this.route('post', { // Route for posts
        path: '/p/:_id',
        template: 'posts',
        data: function () {
            var params = this.params;
            return {
                post: function () {
                    return Posts.findOne({ _id: params._id });
                },
                user: function () {
                return Meteor.user();
                },
                gravatar: function () {
                    return 'http://secure.gravatar.com/avatar/' + CryptoJS.MD5(Meteor.user().emails[0].address) + '?s=300&d=identicon';
                },
                username: function () {
                    return Meteor.user().username;
                }
            };
        },
        load: function () {
            $('select').selectpicker();
            $('[data-toggle=tooltip]').tooltip();
            $('head').prepend('<link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">');
        }
    });

    this.route('topic', { // Route for topics
        path: '/:topic',
        template: 'disp-topics',
        data: function () {
            var params = this.params;
            return {
                topic: function () {
                    return Topics.findOne({ name: params.topic });
                },
                posts: function () {
                    return Posts.find({ topic: params.topic }, {sort: { time: -1 }}).fetch();
                },
                user: function () {
                return Meteor.user();
                },
                gravatar: function () {
                    return 'http://secure.gravatar.com/avatar/' + CryptoJS.MD5(Meteor.user().emails[0].address) + '?s=300&d=identicon';
                },
                username: function () {
                    return Meteor.user().username;
                }
            };
        },
        load: function () {
            $('select').selectpicker();
            $('[data-toggle=tooltip]').tooltip();
            $('head').prepend('<link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">');
        }
    });
});

if (Meteor.isClient) { // Client side code

    Accounts.ui.config({ // Accounts ui config settings
        passwordSignupFields: 'USERNAME_AND_EMAIL'
    });

    /* Settings the {{topic}} handlebar expression to a list of the topics */
    Template.topics.topic = function () { return Topics.find().fetch(); };
    Template.maker.topic = function () { return Topics.find().fetch(); };

    /* Bootstrap javascript for tabs */
    Template.controls.rendered = function () {
        $('#tabs > li > a').each(function (index, elem) {
            $(elem).on('click', function (e) {
                e.preventDefault();
                $(this).tab('show');
            });
        });
    };

    /* Adds the javascript for Bootstrap-select and adds listener to display the post preview */
    Template.maker.rendered = function () {
        $('select').selectpicker();
        $('textarea').keyup(function () {
            $('#preview').html(converter.makeHtml($('#content').val().replace(/(<([^>]+)>)/ig,"")));
        });
    };

    /* Adds link type functionality to the tr elements of the tables */
    Template.topics.rendered = function () {
        $('tr').not($('tr')[0]).on('click focus', function (e) {
            e.preventDefault();
            window.location.assign($(this).attr('href'));
        });
    };
    Template.topic.rendered = function () {
        $('tr').not($('tr')[0]).on('click focus', function (e) {
            e.preventDefault();
            window.location.assign($(this).attr('href'));
        });
    };

    /* Converts the post markdown and time stamp */
    Template.post.rendered = function () {
        $('#post').html(converter.makeHtml($('#post > p').text()));
        if($('#time').text())
            $('#time').text(moment($('#time').text(), 'X').fromNow());
    };

    /* Redirects unsigned in users */
    Template.redirect.rendered = function () {
        window.location.assign('/');
    };

    Template.replies.rendered = function () {
        var converter = new Showdown.converter();
        $('.markdown').each(function (index, elem) {
            $(elem).html(converter.makeHtml($(elem).children('p').text()));
        });
        $('.time').each(function (index, elem) {
            $(elem).text(moment($(this).text(), 'X').fromNow());
        });
    };

    Template.post.helpers({
        colors: function () {
        var loc = window.location.pathname.replace('/p/', '');
            if (Posts.findOne({ _id: loc }).location != 'undefined')
                return Posts.findOne({ _id: loc }).location.split('#').slice(1,5);
            return '';
        }
    });

    Template.replies.helpers({
        reply: function () {
            return Replies.find({ topic: window.location.pathname }, {sort: {time: -1}}).fetch();
        }
    });

    /* Events for the controls of the main page */
    Template.controls.events = {
        'click #newtopic': function () { // Toggles the make new topic input
            $('#new').slideToggle();
        },

        'click #make': function () { // Makes the new topic
            if (Topics.findOne({ name: $('[name=newtopic]').val() })) // Checks if the topic exists
                alert('That topic already exists');
            if ($('[name=newtopic]').val()) { // If it does, add it
                Topics.insert({ // Inserts the topic into the Topics collection
                    admin: '<i class="fa fa-check"></i> open',
                    name: $('[name=newtopic]').val().replace(/(<([^>]+)>)/ig,""),
                    posts: 0,
                    creator: ('#' + CryptoJS.MD5(Meteor.userId())).slice(0, 7)
                });
                window.location.assign('/' + $('[name=newtopic]').val()); // Takes you to the new topic
            } else
                alert('You need to specify a name');
        }
    };

    Template.maker.events = { // Events for the post maker interface
        'click #location': function () { // Sets the location color value
            $('#location').replaceWith('<div class="input-group col-xs-12"><span class="input-group-btn"><button class="btn btn-primary"><i class="fa fa-location-arrow"></i></button></span><div id="colors" class="col-xs-12"></div></div>');
            getLocation();
        },

        'click #post': function () { // Posts the post
            if ($('[name=title]').val() && $('#content').val() && $('.selectpicker').val() != 'TOPIC') { // Checks if all require inputs have values
                Posts.insert({ // Inserts the post into the Posts collection
                    title: $('[name=title]').val().replace(/(<([^>]+)>)/ig,""),
                    topic: $('.selectpicker').val().replace(/(<([^>]+)>)/ig,""),
                    location: $('#location').val().replace(/(<([^>]+)>)/ig,""),
                    post: $('#content').val().replace(/(<([^>]+)>)/ig,""),
                    poster: Meteor.user().username,
                    time: $.now() / 1000 |0
                });
                Meteor.call('calcPosts', $('.selectpicker').val().replace(/(<([^>]+)>)/ig,"")); // Caculates the post counts for the main page
                window.location.assign('/p/' + Posts.findOne({ title: $('[name=title]').val().replace(/(<([^>]+)>)/ig,"") })._id); // Takes you to the post
            } else {
                alert('You need to specify a title and add content!');
            }
        }
    };

    Template.post.events = {
        'click #location': function () {
            $('#location').replaceWith('<div class="btn-block input-group col-xs-12"><span class="input-group-btn"><button class="btn btn-sm btn-primary"><i class="fa fa-location-arrow"></i></button></span><div id="colors" class="btn-block col-xs-12"></div></div>');
            getLocation();
        },

        'click #reply': function () {
            console.log('reply');
            Replies.insert({
                name: getCurrentUsername(),
                reply: $('#location').val().replace(/(<([^>]+)>)/ig,""),
                time: $.now() / 1000 |0,
                location: 'none',
                topic: window.location.pathname
            });
            $('#reply-text').val('');
        }
    };
}

if (Meteor.isServer) { // Server side code

    Topics.allow({ // Allow rules for the Topics collection
        insert: function (userId, doc) { // Checks for html injection, if the topic exists, and if all the required fields are set
            return  doc.admin && doc.name && doc.posts && doc.creator &&
                doc.admin === '<i class="fa fa-check"></i> open' &&
                doc.name === doc.name.replace(/(<([^>]+)>)/ig,"") &&
                doc.posts === 0 &&
                doc.creator === ('#' + CryptoJS.MD5(userId)).slice(0, 7) &&
                !Topics.findOne({name: doc.name}) &&
                doc.name !== 'TOPIC';
        }
    });

    Posts.allow({ // Allow rules for the Posts collection
        insert: function (userId, doc) { // Checks for html injection, if the topic exists, if all the required fields are set, and if the user exists
            return doc.title && doc.topic && doc.post && doc.poster &&
                doc.title === doc.title.replace(/(<([^>]+)>)/ig,"") &&
                doc.topic === doc.topic.replace(/(<([^>]+)>)/ig,"") &&
                Topics.findOne({ name: doc.topic }) &&
                doc.post === doc.post.replace(/(<([^>]+)>)/ig,"") &&
                doc.poster === getCurrentUsername();
        }
    });

    Replies.allow({
        insert: function (userId, doc) {
            return true;
        }
    });

    Meteor.startup(function () { // Runs when the server starts up
        Meteor.methods({ // Adds methods callable on the server
            calcPosts: function (topic) { // Calculates the number of posts in topic specified
                var posts = Posts.find({ topic: topic }).fetch();
                Topics.update({ name: topic }, { $set: { posts: posts.length } });
            }
        });
    });
}