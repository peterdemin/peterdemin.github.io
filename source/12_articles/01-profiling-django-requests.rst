Profiling django requests
=========================

My favorite way of profiling requests to Django site::

	$ python manage.py shell
	In [1]: from django.test.client import Client
	In [2]: client = Client()
	In [3]: # Run request under cProfile saving results to profile.pstats
	In [4]: %prun -s cumulative -D profile.pstats  client.get('/')
	*** Profile stats marshalled to file u'profile.pstats'.

	In [5]: # Now convert profile.pstats to png image using dot
	In [6]: %%bash
	gprof2dot -f pstats profile.pstats | dot -Tpng -o profile.png

Requirements::
	
	gprof2dot			# For rendering profile results in dot format
	ipython				# For magic commands %prun and %%bash

If ipython is not an option, cProfile.runctx can be used:

>>> import cProfile
>>> cProfile.runctx("client.get('/')", globals(), locals(), sort=2, filename='profile.pstats')


.. dropdown:: Example profiler output

    .. image:: images/profile.png
       :target: /_images/profile.png


References
----------

 * `gprof2dot <https://github.com/jrfonseca/gprof2dot>`_ - converter from pstats format to dot
 * `ipython <http://ipython.org/>`_ - powerful interactive shell
 * `cProfile.runctx <https://docs.python.org/2/library/profile.html#profile.runctx>`_ - built-in profiler
