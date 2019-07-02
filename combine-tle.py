# Used to generate satellites.txt from all the TLE files.

import glob
import re

mre = re.compile('LEOV_(Inclined|Polar)_Orbit(\\d+)_Sat(\\d+)\.tle')

files = glob.glob('*.tle')

for fname in files:
    with open(fname, 'r') as f:
        m = mre.search(fname)
        if m is None: continue
        
        data = f.read()
        constellation = 'I' if m.group(1)=='Inclined' else 'P'
        orbit = int(m.group(2))
        sat = int(m.group(3))
        #if constellation!='P': continue
        #if sat!=1: continue
        print('%s_%02i_%02i'%(constellation, orbit, sat))
        print(data)
