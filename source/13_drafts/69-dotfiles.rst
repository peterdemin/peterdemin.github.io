..
    echo >>source/13_drafts/69-dotfiles.rst Dot files 
    echo >>source/13_drafts/69-dotfiles.rst ========= 
    echo >>source/13_drafts/69-dotfiles.rst ``~/.vimrc``
    echo >>source/13_drafts/69-dotfiles.rst ``--------``
    cat  >>source/13_drafts/69-dotfiles.rst ~/.vimrc
    echo >>source/13_drafts/69-dotfiles.rst ``~/.vim/coc-settings.json``
    echo >>source/13_drafts/69-dotfiles.rst ``------------------------``
    cat  >>source/13_drafts/69-dotfiles.rst ~/.vim/coc-settings.json

Dot files
=========

~/.vimrc
--------

.. code-block:: vim

    set nocompatible
    filetype off

    " set rtp+=~/.vim/bundle/vundle/
    " call vundle#rc()

    call plug#begin()

    " let Vundle manage Vundle
    " required!
    " Plug 'gmarik/vundle'

    " The bundles you install will be listed here
    " Bundle 'Lokaltog/powerline', {'rtp': 'powerline/bindings/vim/'}
    Plug 'scrooloose/nerdtree'
    " Bundle 'klen/python-mode'
    " Plug 'Valloric/YouCompleteMe'
    Plug 'vim-scripts/indentpython.vim'
    " Plug 'scrooloose/syntastic'
    Plug 'nvie/vim-flake8'
    Plug 'djoshea/vim-autoread'
    " Plug 'janko-m/vim-test'  - useless with bazel
    " Plug 'kien/ctrlp.vim'
    " Plug 'mfukar/robotframework-vim'
    Plug 'mitsuhiko/vim-jinja'
    " Plug 'saltstack/salt-vim'
    Plug 'altercation/vim-colors-solarized'
    " Plug 'mattn/emmet-vim'
    " Plug 'kchmck/vim-coffee-script'
    Plug 'tpope/vim-surround'
    Plug 'mantiz/vim-plugin-dirsettings'
    " Plug 'junegunn/goyo.vim'
    Plug 'mileszs/ack.vim'
    Plug 'tpope/vim-rsi'
    Plug 'godlygeek/tabular'
    " Plug 'plasticboy/vim-markdown'
    Plug 'junegunn/fzf'
    Plug 'junegunn/fzf.vim'
    Plug 'tpope/vim-repeat'
    Plug 'neoclide/coc.nvim', {'branch': 'release'}

    call plug#end()

    filetype plugin indent on
    syntax on
    set background=dark
    " set background=light
    set t_Co=16
    let g:solarized_termcolors=16
    colorscheme solarized

    if &diff
        colorscheme solarized
        set syntax=none
    endif


    augroup vimrc_autocmds
        autocmd!
        " highlight characters past column 120
        " autocmd FileType python highlight Excess ctermbg=DarkGrey guibg=Black
        " autocmd FileType python match Excess /\%150v.*/
        autocmd FileType python set nowrap
        autocmd FileType python set colorcolumn=120
        augroup END

    " Powerline setup
    " set encoding=utf-8
    " set guifont=DejaVu\ Sans\ Mono\ for\ Powerline\ 9
    " set laststatus=2
    " set fillchars+=stl:\ ,stlnc:\
    " let g:Powerline_symbols = 'fancy'

    " NerdTree setup
    map <F2> :NERDTreeToggle<CR>
    command NERDTreeFindAndFocus call NERDTreeFind() | call NERDTreeFocus()
    map <silent> <C-n> :NERDTreeFindAndFocus<CR>
    let NERDTreeIgnore = ['\.pyc$']

    " " YouCompleteMe
    " let g:ycm_autoclose_preview_window_after_completion=1
    " let g:ycm_python_binary_path = 'python'  " Py3 support

    " syntastic
    " let python_highlight_all=1

    " vim.test
    " let test#python#runner = 'pytest'

    " " Goyo
    " function! s:goyo_enter()
    "   silent !tmux set status off
    "   silent !tmux list-panes -F '\#F' | grep -q Z || tmux resize-pane -Z
    " endfunction
    " 
    " function! s:goyo_leave()
    "   silent !tmux set status on
    "   silent !tmux list-panes -F '\#F' | grep -q Z && tmux resize-pane -Z
    "   set background=dark
    " endfunction

    " autocmd! User GoyoEnter nested call <SID>goyo_enter()
    " autocmd! User GoyoLeave nested call <SID>goyo_leave()

    " ack/ag
    let g:ackprg = 'ag --vimgrep --smart-case --ignore node_modules --ignore build'

    " cnoreabbrev ag Ack
    " cnoreabbrev aG Ack
    " cnoreabbrev Ag Ack
    " cnoreabbrev AG Ack

    " CtrlP
    " Remove limits on the number of files:
    " let g:ctrlp_max_files=0
    " let g:ctrlp_max_depth=100

    " General settings
    set smartindent
    set expandtab
    set ignorecase
    set smartcase
    set shiftwidth=4
    set tabstop=4
    set hlsearch
    set ruler
    set autowrite
    set autoread
    set nofoldenable
    set number
    " Maintain undo history between sessions in ~/.vim/undodir:
    set undofile
    set undodir=~/.vim/undodir
    " More natural split opening
    set splitbelow
    set splitright
    " Search faster
    set wildignore=*.dll,*.exe,*.pyc,*.pdf,*.doc,*.gz
    set wildignore+=**/node_modules/** 
    " Force UNIX line endings
    set ff=unix

    " Always show at least two lines before/after cursor
    set scrolloff=2
    " Always show at least five columns before/after cursor
    set sidescrolloff=5

    if &history < 1000
      set history=1000
    endif
    if &tabpagemax < 50
      set tabpagemax=50
    endif
    if !empty(&viminfo)
      set viminfo^=!
    endif

    " Shortcuts
    let mapleader = ","
    nnoremap <leader>b Oimport pdb; pdb.set_trace()<Esc>
    nnoremap <leader>rb Oimport pdb; pdb.Pdb(stdout=sys.__stdout__).set_trace()<Esc>
    nnoremap <leader>ib Oimport ipdb; ipdb.set_trace()<Esc>
    nnoremap <leader>h :set hlsearch!<CR>
    nnoremap <leader>l :set list!<CR>
    vnoremap <leader>/ y/<C-R>0<CR>
    nnoremap <leader>? :AckFromSearch!<CR>
    nnoremap <leader>. :let @/=substitute(substitute(substitute(@/, '_\([a-z]\)', '_\\?\1', 'g'), '\<\@<!\([A-Z]\)\C', '_\\?\1', 'g'), '[A-Z]', '\L\0', 'g')<CR>
    nnoremap <leader>t :!bazeltest %:r<CR>
    nnoremap <leader>it :!bazeltest %:r --minloglevel=DEBUG --logtostderr<CR>
    nnoremap <leader>w :%s/\s\+$//e<CR>
    vnoremap <leader>y :'<,'> ! python -c 'import sys, json, yaml; print(yaml.dump(json.load(sys.stdin), indent=2))'
    nnoremap <leader>j :% ! jq .<CR>
    nnoremap <leader>n :NERDTreeFind<CR>
    nnoremap <leader>r :redraw!<CR>
    nnoremap <C-P> :GFiles<CR>

    " Split navigations
    nnoremap <C-J> <C-W><C-J>
    nnoremap <C-K> <C-W><C-K>
    nnoremap <C-L> <C-W><C-L>
    nnoremap <C-H> <C-W><C-H>
    " Use Return as Escape in insert mode
    " inoremap <CR> <Esc>
    " Use K to split string under cursor
    nnoremap <CR> i<CR><Esc>

    " Coc.nvim
    nmap <silent> gd <Plug>(coc-definition)
    nmap <silent> gy <Plug>(coc-type-definition)
    nmap <silent> gi <Plug>(coc-implementation)
    nmap <silent> gr <Plug>(coc-references)

    " Remove trailing whitespace in Python files
    autocmd BufWritePre *.py %s/\s\+$//e

    " Settings for working with YAML
    au BufRead,BufNewFile *.mwyml set filetype=yaml
    autocmd FileType yaml setlocal ts=2 sts=2 sw=2 expandtab
    autocmd FileType html setlocal ts=2 sts=2 sw=2 expandtab

~/.vim/coc-settings.json
------------------------

.. code-block:: javascript

    {
      "jedi.enable": true,
      "jedi.startupMessage": false,
      "jedi.markupKindPreferred": "plaintext",
      "jedi.trace.server": "off",
      "jedi.jediSettings.autoImportModules": [],
      "jedi.jediSettings.caseInsensitiveCompletion": true,
      "jedi.jediSettings.debug": false,
      "jedi.executable.command": "jedi-language-server",
      "jedi.executable.args": [],
      "jedi.codeAction.nameExtractFunction": "jls_extract_def",
      "jedi.codeAction.nameExtractVariable": "jls_extract_var",
      "jedi.completion.disableSnippets": false,
      "jedi.completion.resolveEagerly": false,
      "jedi.completion.ignorePatterns": [],
      "jedi.diagnostics.enable": true,
      "jedi.diagnostics.didOpen": true,
      "jedi.diagnostics.didChange": true,
      "jedi.diagnostics.didSave": true,
      "jedi.hover.enable": true,
      "jedi.hover.disable.keyword.all": false,
      "jedi.hover.disable.keyword.names": [],
      "jedi.hover.disable.keyword.fullNames": [],
      "jedi.workspace.extraPaths": [],
      "jedi.workspace.environmentPath": "/Users/peterdemin/.virtualenvs/9/bin/python",
      "jedi.workspace.symbols.maxSymbols": 20,
      "jedi.workspace.symbols.ignoreFolders": [
        ".nox",
        ".tox",
        ".venv",
        "__pycache__",
        "venv"
      ]
    }
