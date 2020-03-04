#!/usr/bin/env python

import csv
import yaml
import sys
import os.path

def parse_lat_lng(x):
  if '°' in x:
    # DMS format
    # adapted from https://stackoverflow.com/questions/1140189/converting-latitude-and-longitude-to-decimal-values
    import re
    parts = re.split('[^\d\w\.]+', x)
    dd = int(parts[0]) + int(parts[1])/60 + int(parts[2])/(60*60)

    # Don't do anything for N or E
    direction = parts[3]
    if direction == "S" or direction == "W":
        dd = dd * -1
    return dd
  else:
    # decimal format
    return eval(x)

def process_one(filename):
    ret = []
    with open(filename) as f:
        rd = csv.reader(f, delimiter='\t')
        first = True
        for row in rd:
            #print(row)
            if len(row)==0:
                continue
            if first:
                first = False
                fields = row
                continue
            if row[0].startswith('#'):
                continue

            d = {}
            for x in zip(fields, row):
                if x[0] in ('lat', 'lng'):
                    v = parse_lat_lng(x[1])
                elif x[0] in ('minel',):
                    v = int(x[1])
                else:
                    v = x[1]
                d[x[0]] = v
            ret.append(d)

    outfilename = os.path.splitext(filename)[0] + '.yaml'
    print(outfilename)
    with open(outfilename, 'w', encoding='utf-8') as f:
        yaml.dump(ret, f, allow_unicode=True)

def process(filenames):
    for filename in filenames:
        process_one(filename)

if __name__=='__main__':
    process(sys.argv[1:])
