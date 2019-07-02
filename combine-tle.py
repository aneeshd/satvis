# Used to generate telesat.txt from all the TLE files.

import os
import glob
import re

mre = re.compile('LEOV_(Inclined|Polar)_Orbit(\\d+)_Sat(\\d+)\.tle')

files = glob.glob('*.tle')

for fname in files:
    with open(fname, 'r') as f:
        m = mre.search(fname)
        if m is None: continue
        
        data = f.read()
        if m.group(1)=='Inclined':
            print('I_%s_%s'%(m.group(2), m.group(3)))
        else:
            print('P_%s_%s'%(m.group(2), m.group(3)))
        print(data)
