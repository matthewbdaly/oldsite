---
title: "Improving search in Vim and Neovim with FZF and Ripgrep"
date: 2018-12-27 18:37:09 +0000
categories:
- vim
- neovim
- editor
comments: true
---

A while back I was asked to make some changes to a legacy project that was still using Subversion. This was troublesome because my usual method of searching in files is to use Tim Pope's Fugitive Vim plugin as a frontend for `git grep`, and so it would be harder than usual to navigate the project. I therefore started looking around for alternative search systems, and one combination that kept on coming up was FZF and Ripgrep, so I decided to give them a try. FZF is a fuzzy file finder, written in Go, while Ripgrep is an extremely fast grep, written in Rust, that respects gitignore rules by default. Both have proven so useful they're now a permanent part of my setup.

On Mac OS X, both are available via Homebrew, so they're easy to install. On Ubuntu, Ripgrep is in the repositories, but FZF isn't, so it was necessary to install it in my home directory. There's a [Vim plugin for FZF and Ripgrep integration](https://github.com/junegunn/fzf.vim), which, since I use vim-plugged, I could install by adding the following to my `init.vim`, then running `PlugUpdate` from Neovim:

```viml
" Search
Plug '~/.fzf'
Plug 'junegunn/fzf.vim'
```

The plugin exposes a number of commands that are very useful, and I'll go through the ones I use most often:

* `:Files` is for finding files by name. I used to use Ctrl-P for this, but FZF is so much better and quicker that I ditched Ctrl-P almost immediately (though you can map `:Files` to it if you want to use the same key).
* `:Rg` uses Ripgrep to search for content in files, so you can search for a specific string. This makes it an excellent replacement for the `Ggrep` command from Fugitive.
* `:Snippets` works with Ultisnips to provide a filterable list of available snippets you can insert, making it much more useful
* `:Tags` allows you to filter and search tags in the project as a whole
* `:BTags` does the same, but solely in the current buffer
* `:Lines` allows you to find lines in the project and navigate to them.
* `:BLines` does the same, but solely in the current buffer.

In addition to being useful in Neovim, FZF can also be helpful in Bash. You can use `Ctrl-T` to find file paths, and it enhances the standard `Ctrl-R` history search, making it faster and more easily navigable. The performance of both is also excellent - they work very fast, even on the very large legacy project I maintain, or on slower machines, and I never find myself waiting for them to finish. Both tools have quickly become an indispensable part of my workflow.
