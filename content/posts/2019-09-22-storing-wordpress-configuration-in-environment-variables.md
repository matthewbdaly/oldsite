---
title: "Storing Wordpress configuration in environment variables"
date: 2019-09-22 19:00:34 +0100
categories:
- php
- wordpress
comments: true
---

Wordpress configuration can be a serious pain in the proverbial. Hard-coding configuration details in a PHP file is not a terribly safe way of storing the details for your database, as if the server is misconfigured they can be exposed. In addition, it can be a chore to copy and populate the `wp-config.php` file to a new deploy.

A fundamental principle of [The Twelve-Factor App](https://12factor.net/) is that config should be stored in the environment. While Wordpress does predate this, there's no reason why we can't abide by this. Storing Wordpress configuration in environment variables rather than the `wp-config.php` file has the following advantages:

* It's more secure since the config is not stored in a file in the web root, but in the web server config
* It makes managing the `wp-config.php` file less of a chore - it can be safely committed to version control, and you won't need to change it to match your local configuration, running the risk of accidentally committing and pushing to production with broken config
* Deployment to new servers is simpler because there's no need to update the `wp-config.php`
* The risk of neglecting to change the database details and accidentally messing up the production database when working locally is virtually eliminated

I've seen solutions for this that use DotEnv, but you don't actually need to install that to be able to use environment variables with Wordpress. In fact, in some way it's better if you don't as too many developers use `.env` files in production. PHP natively has the ability to get data from environment variables using the `getenv()` function, so it's easier to use that than to pull in a third-party library.

Here's an abbreviated example of a `wp-config.php` file that's been updated to pull the settings from environment variables:

```php
<?php
// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', getenv('DB_NAME') );

/** MySQL database username */
define( 'DB_USER', getenv('DB_USER') );

/** MySQL database password */
define( 'DB_PASSWORD', getenv('DB_PASSWORD') );

/** MySQL hostname */
define( 'DB_HOST', getenv('DB_HOST') );

/** Database Charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The Database Collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

define( 'AUTH_KEY',         getenv('AUTH_KEY') );
define( 'SECURE_AUTH_KEY',  getenv('SECURE_AUTH_KEY') );
define( 'LOGGED_IN_KEY',    getenv('LOGGED_IN_KEY') );
define( 'NONCE_KEY',        getenv('NONCE_KEY') );
define( 'AUTH_SALT',        getenv('AUTH_SALT') );
define( 'SECURE_AUTH_SALT', getenv('SECURE_AUTH_SALT') );
define( 'LOGGED_IN_SALT',   getenv('LOGGED_IN_SALT') );
define( 'NONCE_SALT',       getenv('NONCE_SALT') );

$table_prefix = 'wp_';

define( 'WP_DEBUG', getenv('WP_DEBUG') );

/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

/** Sets up WordPress vars and included files. */
require_once( ABSPATH . 'wp-settings.php' );
```

If you're using Lando for local development, you will need to specify a file to include that contains the environment variables you wish to set, as in this example:

```yaml
name: wordpress
recipe: wordpress
config:
  webroot: .
env_file:
  - .env
```

This filename can be any arbitrarily chosen name. Then, you define the values for those variables in the same way you normally would in a `.env` file. Here's an abbreviated example that excludes the crypto settings (though those should be placed here too):

```env
DB_NAME=wordpress
DB_USER=wordpress
DB_PASSWORD=wordpress
DB_HOST=database
WP_DEBUG=true
...
```

This will work fine during local development, but in production, or if you're using something like Vagrant for local development, you'll want to set the environment variables in the server configuration. For Apache, this is best set in the Virtualhost configuration, although you should be able to set it in an `.htaccess` file if all else fails. You need to use the `SetEnv` directive, as in this example:

```apache
SetEnv DB_NAME wordpress
SetEnv DB_USER wordpress
SetEnv DB_PASSWORD wordpress
SetEnv DB_HOST database
SetEnv WP_DEBUG true
```

For Nginx, assuming you're using FastCGI, you need to set it in the server configuration for that site using the `fastcgi_param` directive, as shown below:

```nginx
fastcgi_param DB_NAME wordpress;
fastcgi_param DB_USER wordpress;
fastcgi_param DB_PASSWORD wordpress;
fastcgi_param DB_HOST database;
fastcgi_param WP_DEBUG true;
```

Since Wordpress doesn't ship with any kind of command-line task runner, this should be sufficient for most installs. However, if you're using WP CLI, that will break it as it won't have access to environment variables set by Apache or Nginx, so you'll also need to set them for the user that runs WP CLI by adding them to their Bash config in the usual way.
