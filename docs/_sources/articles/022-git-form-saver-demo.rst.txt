Git form saver demo
===================

Generate security token for demo server
---------------------------------------

.. raw:: html

    <form action="https://gitformsaver.demin.dev/token" method="POST">
      <div>
        <label for="repo">Enter repository URL:</label>
        <input name="repo" value="git@github.com:peterdemin/peterdemin.github.io" />
      </div>
      <div>
        <label for="file">File path:</label>
        <input name="file" value="source/articles/022-git-form-saver-demo.rst" />
      </div>
      <div>
        <label for="secret">Secret (optional):</label>
        <input name="secret" value="" />
      </div>
      <div>
        <button>Submit</button>
      </div>
    </form>

Add text to this page
---------------------

.. note::

    Everything submitted through this form will be appended to this page

.. raw:: html

    <form action="https://gitformsaver.demin.dev/" method="POST">
      <div>
        <label for="name">What is your name?</label>
        <input name="name" id="name" value="Anonymous" />
      </div>
      <div>
        <label for="say">What do you want to say?</label>
        <input name="say" id="say" value="Hi" />
      </div>
      <input type=hidden name="repo" value="git@github.com:peterdemin/peterdemin.github.io" />
      <input type=hidden name="file" value="source/articles/022-git-form-saver-demo-comments.txt" />
      <input type=hidden name="redirect" value="https://peter.demin.dev/articles/022-git-form-saver-demo.html" />
      <div>
        <button>Submit</button>
      </div>
    </form>

Comments
--------

.. literalinclude:: 022-git-form-saver-demo-comments.txt
   :start-after: GFS-JWT
