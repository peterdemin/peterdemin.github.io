:orphan:

.. _git-form-saver:

Git form saver
==============

.. contents::
   :local:

What is Git form saver
----------------------

Git form saver is an HTTP API that pushes HTML forms to git repositories.

In a nutshell, API does the following:

- Accept HTTP POST request.
- Clone git repository passed in ``repo`` parameter.
- Format the passed form fields using chosen ``formatter``.
- Append formatted data to a file passed in ``file`` parameter.
- Push changes back to git repository.


When to use Git form saver
--------------------------

Git form saver is useful when you want to allow appending data to specific file in a git repo through HTML form submission.

**Use-cases**

- In public environment:

    - Collect anonymous comments.
    - Publish comments on statically-generated websites.
    - A replacement for a database for simple data models.

- In protected environment:

    - Collect usage statistics from internal commandline tools.
    - Simple plain-text file journaling without git access (mobile).


Security features
-----------------

Git form saver supports limiting user actions in 3 ways:

1. Git form saver uses SSH with **private key authentication**
   for all interactions with git repositories.
   It can only access repositories that allowed its public key.
2. **Mandatory token** --- Git form saver appends form submissions
   only to the files, that contain a cryptographically secure
   Java Web Token (JWT) at the beginning of the file.
3. For protected environments, form owner can optionally set up **secret** value,
   required for the token verification.

Git SSH authentication
~~~~~~~~~~~~~~~~~~~~~~

Each git form saver instance can have a unique private key used for all
git interactions. The same private key is used for generating the JWT.
Private key never leaves the server and is hidden from target
git repository and form owners.

.. note::

   On GitHub, you can either add Git form saver's public SSH key to your account,
   or create a separate GitHub account and add as a collaborator to your repo.

Mandatory token
~~~~~~~~~~~~~~~

To enable Git form saver to append forms to a file, you need to generate
a security token, and save it in the target file.
Security token encodes repository URL and file path (with optional secret)
using Git form saver's private key.
Long unique token ensures, that Git form saver can access only
specific files inside the repository.

The token is different for each repository and for each file inside the repository.

Secret
~~~~~~

For protected environments, as internal networks, or mobile applications,
security token can include additional ``secret`` value.
Only form submissions, that include this ``secret`` value will be permitted.

Demo server
-----------

To allow demo instance to access your repository,
you need to add its SSH public key to the target git repository.

If your repository is on GitHub, you can just
add a special `GitHub account <https://github.com/git-form-saver>` as collaborator.

Otherwise, add this public key to your repo for read and write access:

.. code-block:: text

    ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDAgnNh5XUOJItYkNrO0bSl0tNrOmbBNpD0Nl7Wo5JdoHEBZ9ksQIqdCiLwsqp/jdr9YCUiDKfMv6i3NCrFoYcD2u1x4p7bepKJ2bMaQRiDbzBGgI102lPjNSmiv7HxPDFdrJYtagWZGn0CCvVyK5jW1QV2w9CzQDJXlRI78DmhQnSJkVsE0cGNDvHXcWRi17MBAbcfx1+UOejHQsfP3NEVhS3QnPImS6cYk5hg+OO/ABnRsvCJCqoKpjvtQNSqLiYCZDuiOW7xvkC9zUw4ixAOjcuZvvqWYzFRypJSVscqCTW0aYWk5wadWw6lIbJP44zwp3cCtZ0qz9XZ9IYtLDarYpGERLQPplYBW+F6A7tirLx8OpALKDsXE4q5evgBWJofuWpfBl1tmkp2qySGnrmGsJYY6jFhGruvqGnZZzawU+NN51UBEP23sgZF7dozslgBR8D8fJJqhe/NEt1wtmXYfUYDJJg4KaqIER9sgSJKYwHhB2v37oby1n/j0S6Ti2M= gitformsaver@instance-1


Security token generation
~~~~~~~~~~~~~~~~~~~~~~~~~

Use this form to generate a security token for your repo:

.. raw:: html

    <script>
    function generateToken(event, form) {
        event.preventDefault();
        const formInputs = form.getElementsByTagName("input");
        let formData = new FormData();
        for (let input of formInputs) {
            formData.append(input.name, input.value);
        }
        fetch(
            form.action,
            {
                method: form.method,
                body: formData
            }
        )
        .then(response => response.text)
        .then(text => console.log(data))
        .catch(error => console.log(error.message));
    }
    </script>

    <form action="https://gitformsaver.demin.dev/token" method="POST" onsubmit="generateToken(event, this)">
      <div>
        <label for="repo">Enter repository URL:</label>
        <input name="repo" value="git@github.com:user/repo.git" />
      </div>
      <div>
        <label for="file">File path:</label>
        <input name="file" value="file.txt" />
      </div>
      <div>
        <label for="secret">Secret (optional):</label>
        <input name="secret" value="" />
      </div>
      <div>
        <button>Generate token</button>
      </div>
    </form>

    <div id="token" />


The token must be manually saved to the target file
somewhere in the beginning (first 2 KiB).

Save text to any file
~~~~~~~~~~~~~~~~~~~~~

Once the preparations are done, you can submit this form.
The text will be appended to the target file, after a little delay.

.. raw:: html

    <form action="https://gitformsaver.demin.dev/" method="POST">
      <div>
        <label for="repo">Repository URL</label>
        <input name="repo" value="git@github.com:user/repo.git" />
      </div>
      <div>
        <label for="file">File path inside of the repository</label>
        <input name="file" value="README.md" />
      </div>
      <div>
        <label for="text">Text</label>
        <input name="text" id="text" value="Text" />
      </div>
      <div>
        <label for="redirect">Redirect target after submission</label>
        <input name="redirect" value="https://gitformsaver.github.io" />
      </div>
      <div>
        <button>Send</button>
      </div>
    </form>
