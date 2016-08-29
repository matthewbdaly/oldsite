---
title: "Maintaining your CV with Markdown and Emacs"
date: 2016-08-29 16:40:08 +0100
categories:
- markdown
- emacs
comments: true
---

I've recently been jobhunting, so that has meant having to update my CV. Fortunately, I've got into the habit of keeping it up to date easily by writing it in Markdown and generating it in the required format on demand. That way I can easily convert it to HTML, PDF or Microsoft DocX format as and when I need it. I thought I'd share this method as it works very well for me.

Maintaining your CV in Emacs?
-----------------------------

Yes, you read that right! Although I'm a die-hard Vim user, I do use Emacs for a few things. One of them is time-tracking using `org-mode`, and another is maintaining my CV.

First of all you'll need to install `pandoc`, `texlive` and `markdown`. On Ubuntu this is easily done using `apt-get`:

```bash
$ sudo apt-get install pandoc markdown texlive
```

You'll also need to install Emacs and the appropriate packages, namely `markdown-mode` and `markdown-mode+`. To do so, first ensure this is in your `.emacs.d/init.el`:

```lisp
(require 'package)
(add-to-list 'package-archives '("melpa" . "http://melpa.org/packages/"))
(package-initialize)

;; Markdown support
(require 'markdown-mode)
(require 'markdown-mode+)
(setq markdown-command "/usr/bin/markdown")
(add-to-list 'auto-mode-alist '("\\.markdown$" . markdown-mode))
(add-to-list 'auto-mode-alist '("\\.md$" . markdown-mode))
(setq markdown-css-paths `(,(expand-file-name "Documents/markdown.css")))
```

Then fire up Emacs, ignoring the warnings you get, and run `M-x package-list-packages` to load the list of available packages. I'll leave navigating and installing this list of packages to you, but once they're done you should have everything you need.

This assumes the stylesheet you wish to use is at `~/Documents/markdown.css` - adjust the path if necessary. You may also need to amend the path to your Markdown install if the location differs. You can put what you like in the stylesheet, but my advice is to keep it as simple as you can - it's your CV, not a web page. Here's what I use:

```css
body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    width: 80%;
    margin: auto;
    background: #ffffff;
    padding: 10px;
}

h2 {
    font-size: 30px;
    color: #757575;
    text-align: center;
    margin-bottom: 15px;
}

h1 {
    font-size: 55px;
    color: #757575;
    text-align: center;
    margin-bottom: 15px;
}

hr {
    color: #000000;
}

ul li {
    list-style-type: disc;
}

blockquote {
    text-align: center;
}

a, a:visited, a:hover {
    text-decoration: none;
    color: #000000;
}

a:link, a:hover, a:visited {
    text-decoration: none;
    color: black;
}

code {
    white-space: pre-wrap;
    word-wrap: break-word;
}
```

Next, we write our CV in Markdown. Here's a sample one based on mine:

```markdown
James Smith
============

About me
--------

I'm a full-stack web developer. I have built a wide variety of web applications (including single-page web apps), content based sites and REST APIs.

---

Skills
----------
* HTML5
* CSS, Sass and Compass
* Javascript, including Angular.js
* PHP, including Laravel and Lumen

---

Employment
----------

**Agency ltd**
June 2014 - present

I worked for a busy digital agency, building custom web apps using Laravel and Angular.js

---

Education
----------

* **2009-2014 My Secondary School, London** - 7 GCSEs:

---

Hobbies and Interests
---------------------

Real ale, learning more about webdev, reading, socialising.

---

Contact
-------

> **Mobile:** 01234 567890

> **[Email](mailto:user@example.com)** - **[Website](http://www.example.com)** - **[GitHub](https://github.com/username)**
```

Now, if you save this file as something like `cv.md` and then open it up in Emacs, you should be able to preview it in your browser with `C-c C-c p`. Nice, huh? To export it to HTML, run `C-c C-c v` instead.

What if you want to view it in other formats? Say a potential employer is asking for your CV in Microsoft DocX format (ugh...)? Just run this command in the shell:

```bash
$ pandoc -s -S cv.md -o cv.docx
```

Or how about PDF?

```bash
$ pandoc -s -S cv.md -o cv.pdf
```

Using this method it's straightforward to maintain a single master copy of your CV which you can then convert to other formats on demand.

Keeping your CV backed up
-------------------------

If you want to keep your CV safe, there's a couple of ways to do it. One is to keep it in a Git or Mercurial repository, and another is to use Dropbox to keep it in sync. I tend to use the latter approach, although I'm considering switching to the former. If you wanted to generate the various versions automatically, you could set up a hook to generate the various versions using Pandoc during the commit process.

I used to hate updating my CV, but that was largely because I left it too long, and often had nothing much to put on it. Nowadays I'm often learning something new so I quite often have reason to update it to reflect that, and adopting this workflow has made things a lot easier.
