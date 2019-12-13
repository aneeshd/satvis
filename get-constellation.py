#!/usr/bin/env python3




# https://celestrak.com/satcat/tle.php?CATNR=44057

constellations = {
    'oneweb': [44057, 44058, 44059, 44060, 44061, 44062],
    'starlink': [x for x in range(44235, 44294+1)] + [x for x in range(44713, 44772+1)],
    'gx': [39476, 40384, 40882, 42698, 44801],
    'o3b': [39188, 39189, 39190, 39191]+[40079, 40080, 40081, 40082]+[40348, 40349, 40350, 40351]+[43231, 43232, 43233, 43234]+[44112, 44113, 44114, 44115],
    'telesat': [43113],
}

import urllib.request
import sys

def main(cname, ids):
    result = ''
    for id in ids:
        with urllib.request.urlopen("https://celestrak.com/satcat/tle.php?CATNR=%s"%id) as f:
            contents = f.read().decode('utf-8')

        b = contents.find('<pre>')
        e = contents.find('</pre')
        contents = contents[b+1:e]
        contents = '\n'.join([x.strip() for x in contents.strip().split('\n')])
        print(repr(contents))
        result += contents+'\n'

    with open(cname+'.txt', 'w', encoding='utf-8') as f:
        print(result, end='', file=f)

if __name__=='__main__':
    try:
        cname = sys.argv[1]
    except IndexError:
        cname = 'all'

    if cname == 'all':
        for c in constellations.keys():
            main(c, constellations[c])
    else:
        main(cname, constellations[cname])
