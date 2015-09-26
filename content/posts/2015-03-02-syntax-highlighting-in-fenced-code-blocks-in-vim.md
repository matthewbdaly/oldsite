---
title: "Syntax highlighting in fenced code blocks in Vim"
date: 2015-03-02 23:25:43 +0000
categories:
- vim
- markdown
comments: true
---

Just thought I'd share a little trick I picked up recently. As you may know, GitHub flavoured Markdown (which I use for this blog) supports fenced code blocks, allowing you to specify a language for a block of code in a Markdown file.

If you put the following code in your `.vimrc`, you can get syntax highlighting in those code blocks when you open up a Markdown file in Vim:

```viml
"Syntax highlighting in Markdown
au BufNewFile,BufReadPost *.md set filetype=markdown
let g:markdown_fenced_languages = ['bash=sh', 'css', 'django', 'handlebars', 'javascript', 'js=javascript', 'json=javascript', 'perl', 'php', 'python', 'ruby', 'sass', 'xml', 'html']
```
This does depend on having the appropriate syntax files installed. However, you can easily add in syntax files for many other languages that Vim supports, and there are third-party ones available to install - in my case, I've got the `handlebars` one installed, which doesn't come with Vim.
