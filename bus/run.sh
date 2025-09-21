#!/bin/sh

exec ./bus -unix /tmp/bus.sock -socket-mode 666
