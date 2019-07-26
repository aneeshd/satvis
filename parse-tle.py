#!/usr/bin/env python3

def parse_tle(tle1, tle2):
    field_defs = [
        [(3,7), (8,8), (10,11), (12,14), (15,17), (19,20), (21,32), (34,43), (45,52), (54,61), (65,68)],
        [(9,16), (18,25), (27,33), (35,42), (44,51), (53,63), (64,68)]
    ]

    data = []

    for fields, line in zip(field_defs, (tle1, tle2)):
        for field in fields:
            d = line[ field[0]-1:field[1] ].strip()
            #if len(d)>1:
            #    d = d.lstrip('0')
            data.append(d)

    return data

def parse_file(f):
    lines = []
    for line in f:
        line = line.strip()
        if line.startswith('#') or line=='': continue
        lines.append(line)

    while len(lines)>=3:
        name, tle1, tle2 = lines[:3]
        data = [name] + parse_tle(tle1, tle2)
        x = ','.join(data)
        print(x)
        lines = lines[3:]

import sys
filename = sys.argv[1]
parse_file( open(filename, 'r') )
