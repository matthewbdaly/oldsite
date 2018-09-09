---
title: "Switching from Vim to Neovim"
date: 2018-09-09 13:40:35 +0100
categories:
- vim
- neovim
comments: true
---

I honestly thought it would never happen. I've been using Vim since 2008, and every other editor I've tried (including VSCode, Emacs, Sublime Text and Atom) hasn't come up to scratch. There were a few useful features in PHPStorm, to be fair, but nothing that justified the bother of moving. Also, I suffer from a degree of RSI from my prior career as an insurance clerk (years of using crap keyboards and mice on Windows XP took its toll...), and Vim has always been the most RSI-friendly editor I found.

Yet I have actually gone ahead and migrated away... to Neovim. Of course, the fact that the workflow is essentially identical helps in the migration process, as does the fact that it supports most of the same plugins.

My workflow has always been strongly CLI-based. I use GNU Screen and Byobu together to run multiple "tabs" in the terminal, so the lack of GUI support in Neovim doesn't bother me in the slightest. The only change I really made was to my `.bash_aliases` so that the Vim command ran `screen -t Vim nvim`, so that it would open up Neovim rather than Vim in a new Screen tab.

Initially I switched straight over to using the same settings and plugins I had with Vim, and they worked seamlessly. However, after a while I decided to use the opportunity to completely overhaul the plugins and settings I used and largely start over - cull the ones I no longer needed, add some new ones, and comment it properly.

Loading plugins
---------------

I used to use Pathogen to manage my Vim plugins, but it didn't actually import the plugins itself, and just provided a structure for them. This meant that the only practical way I found to pull in third-party plugins was to set them up as Git submodules, meaning I had to store my configuration in version control and clone it recursively onto a new machine. It also made updating cumbersome.

Now I've switched to [vim-plug](https://github.com/junegunn/vim-plug), which makes things much easier. I can define my dependencies in my `.config/nvim/init.vim` and pull them in with `PlugInstall`. If I want to update them, I run `PlugUpdate`, or if I need to add something else, I merely add it in the file and run `PlugInstall` again. Nice and easy.

The first section of my configuration file loads the dependencies:

```vim
call plug#begin()

" NERDTree
Plug 'scrooloose/nerdtree'

" Git integration
Plug 'tpope/vim-fugitive'
Plug 'airblade/vim-gitgutter'

" Linting
Plug 'neomake/neomake'
Plug 'w0rp/ale'

" PHP-specific integration
Plug 'phpactor/phpactor' ,  {'do': 'composer install', 'for': 'php'}
Plug 'ncm2/ncm2'
Plug 'roxma/nvim-yarp'
Plug 'phpactor/ncm2-phpactor'

" Snippets
Plug 'SirVer/ultisnips'
Plug 'honza/vim-snippets'

" Comments
Plug 'tpope/vim-commentary'

" Search
Plug 'ctrlpvim/ctrlp.vim'

" Syntax
Plug 'sheerun/vim-polyglot'
Plug 'matthewbdaly/vim-filetype-settings'

" Themes
Plug 'nanotech/jellybeans.vim' , {'as': 'jellybeans'}

call plug#end()
```

As always, it's a good idea to comment your config and try to group things logically. Note that I have one plugin of my own listed here - this is just a collection of settings for different filetypes, such as making Javascript files use 2 spaces for indentation, and it's easier to keep that in a repository and pull it in as a dependency.

Completion
----------

The next part of the config deals with configuration. Most of the time the default omnicompletion is pretty good, but in the process of building out this config, I discovered PHPActor, which has massively improved my development experience with PHP - it finally provides completion as good as most IDE's, and also provides similar refactoring tools. My config for completion currently looks like this:

```vim
"Completion
autocmd FileType * setlocal formatoptions-=c formatoptions-=r formatoptions-=o
set ofu=syntaxcomplete#Complete
autocmd FileType php setlocal omnifunc=phpactor#Complete
let g:phpactorOmniError = v:true
autocmd BufEnter * call ncm2#enable_for_buffer()
set completeopt=noinsert,menuone,noselect
```

General config
--------------

This is a set of standard settings for the general behaviour of the application, such as setting the colorscheme and default indentation levels. I also routinely disable the mouse because it bugs me.

```vim
"General
syntax on
colorscheme jellybeans
set nu
filetype plugin indent on
set nocp
set ruler
set wildmenu
set mouse-=a
set t_Co=256

"Code folding
set foldmethod=manual

"Tabs and spacing
set autoindent
set cindent
set tabstop=4
set expandtab
set shiftwidth=4
set smarttab

"Search
set hlsearch
set incsearch
set ignorecase
set smartcase
set diffopt +=iwhite
```

Markdown configuration
----------------------

This section sets the file type for Markdown. It disables the Markdown plugin included in `vim-polyglot` as I had problems with it, and sets the languages that will be highlighted in fenced code blocks. I may at some point migrate this to the filetype repository.

```vim
"Syntax highlighting in Markdown
au BufNewFile,BufReadPost *.md set filetype=markdown
let g:polyglot_disabled = ['markdown']
let g:markdown_fenced_languages = ['bash=sh', 'css', 'django', 'javascript', 'js=javascript', 'json=javascript', 'perl', 'php', 'python', 'ruby', 'sass', 'xml', 'html', 'vim']
```

Neomake
-------

I used to use Syntastic for checking my code for errors, but I've always found it problematic - it was slow and would often block the editor for some time. Neovim does have support for asynchronous jobs (as does Vim 8), but Syntastic doesn't use it, so I decided to look elsewhere.

Neomake seemed a lot better, so I migrated over to it. It doesn't require much configuration, and it's really fast - unlike Syntastic, it supports asynchronous jobs. This part of the config sets it up to run on changes with no delay in writing, so I get near-instant feedback if a syntax error creeps in, and it doesn't block the editor the way Syntastic used to.

```vim
" Neomake config
" Full config: when writing or reading a buffer, and on changes in insert and
" normal mode (after 1s; no delay when writing).
call neomake#configure#automake('nrwi', 500)
```

PHPActor
--------

As mentioned above, PHPActor has dramatically improved my experience when coding in PHP by providing access to features normally found only in full IDE's. Here's the fairly standard config I use for the refactoring functionality:

```vim
" PHPActor config
" Include use statement
nmap <Leader>u :call phpactor#UseAdd()<CR>

" Invoke the context menu
nmap <Leader>mm :call phpactor#ContextMenu()<CR>

" Invoke the navigation menu
nmap <Leader>nn :call phpactor#Navigate()<CR>

" Goto definition of class or class member under the cursor
nmap <Leader>o :call phpactor#GotoDefinition()<CR>

" Transform the classes in the current file
nmap <Leader>tt :call phpactor#Transform()<CR>

" Generate a new class (replacing the current file)
nmap <Leader>cc :call phpactor#ClassNew()<CR>

" Extract expression (normal mode)
nmap <silent><Leader>ee :call phpactor#ExtractExpression(v:false)<CR>

" Extract expression from selection
vmap <silent><Leader>ee :<C-U>call phpactor#ExtractExpression(v:true)<CR>

" Extract method from selection
vmap <silent><Leader>em :<C-U>call phpactor#ExtractMethod()<CR>
```

Summary
-------

Vim or Neovim configuration files are never static. Your needs are always changing, and you're constantly discovering new plugins and new settings to try out, and keeping ones that prove useful. It's been helpful to start over and ditch some plugins I no longer needed, pull in some new ones, and organise my configuration a bit better.

Now that I can set the dependencies in a text file rather than pulling them in as Git submodules, it makes more sense to keep my config in a [Github Gist](https://gist.github.com/matthewbdaly/80b777ad3db885ebeecd27687fb121cd) rather than a Git repository, and that's where I plan to retain it for now. Feel free to fork or cannibalize it for your own purposes if you wish.
