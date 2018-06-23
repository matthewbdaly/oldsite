---
title: "Forcing SSL in CodeIgniter"
date: 2018-06-23 13:03:28 +0100
categories:
- php
- codeigniter
comments: true
---

I haven't started a new CodeIgniter project since 2014, and don't intend to, but on occasion I've been asked to do maintenance work on legacy CodeIgniter projects. This week I was asked to help out with a situation where a CodeIgniter site was being migrated to HTTPS and there were issues resulting from the migration.

Back in 2012, when working on my first solo project, I'd built a website using CodeIgniter that used HTTPS, but also needed to support an affiliate marketing system that did not support it, so certain pages had to force HTTP, and others had to force HTTPS, so I'd used the hook system to create hooks to enforce this. This kind of requirement is unlikely to reoccur now because HTTPS is becoming more prevalent, but sometimes it may be easier to enforce HTTPS at application level than in the web server configuration or using htaccess. It's relatively straightforward to do that in CodeIgniter.

The first step is to create the hook. Save this as `application/hooks/ssl.php`:

```php
<?php
function force_ssl()
{
    $CI =& get_instance();
    $CI->config->config['base_url'] = str_replace('http://', 'https://', $CI->config->config['base_url']);
    if ($_SERVER['SERVER_PORT'] != 443) redirect($CI->uri->uri_string());
}
?>
```

Next, we register the hook. Update `application/configs/hooks.php` as follows:

```php
<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');
/*
| -------------------------------------------------------------------------
| Hooks
| -------------------------------------------------------------------------
| This file lets you define "hooks" to extend CI without hacking the core
| files.  Please see the user guide for info:
|
|	http://codeigniter.com/user_guide/general/hooks.html
|
*/

$hook['post_controller_constructor'][] = array(
                                'function' => 'force_ssl',
                                'filename' => 'ssl.php',
                                'filepath' => 'hooks'
                                );

/* End of file hooks.php */
/* Location: ./application/config/hooks.php */
```

This tells CodeIgniter that it should looks in the `application/hooks` directory for a file called `ssl.php`, and return the function `force_ssl`.

Finally, we enable hooks. Update `application/config/config.php`:

```php
$config['enable_hooks'] = TRUE;
```

If you only want to force SSL in production, not development, you may want to amend the `ssl.php` file to only perform the redirect in non-development environments, perhaps by using an environment variable via DotEnv.
