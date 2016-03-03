Title: Profiling django requests
Date: 2016-03-03 15:38
Category: Python

Here is my favorite way of profiling requests to Django site:

	$ python manage.py shell_plus
	In [1]: from django.test.client import Client
	In [2]: client = Client()
	In [3]: # Run request under cProfile saving results to profile.pstats
	In [4]: %prun -s cumulative -D profile.pstats  client.get('/award/')
	*** Profile stats marshalled to file u'profile.pstats'.

	In [5]: # Now convert profile.pstats to png image using dot
	In [6]: %%bash
	gprof2dot -f pstats profile.pstats | dot -Tpng -o profile.png

Here are requirements:
	
	gprof2dot			# For rendering profile results in dot format
	django-extensions	# For fancy django shell
	ipython				# For magic commands %prun and %bash

And of course django settings must have:

	INSTALLED_APPS += (
		'django_extensions',
	)

This will add `shell_plus` command to manage.py which starts ipython console with all models imported.

Check out this [example profiler result](images/profile.png).

### References

 * [gprof2dot](https://github.com/jrfonseca/gprof2dot) - Converter from pstats format to dot
 * [django-extensions](https://github.com/django-extensions/django-extensions) - Development extensions for Django
 * [ipython](http://ipython.org/) - Powerful interactive shell
