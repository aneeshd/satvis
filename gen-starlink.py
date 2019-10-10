#!/usr/bin/env python3
# Based on info from http://licensing.fcc.gov

from gen_tle import walker

inclined = walker('I', 53, 72*22, 22, 18, 550, 3.3)

with open('starlink-planned.txt', 'w', encoding='utf-8') as f:
    ret = inclined
    print(ret, end='', file=f)
