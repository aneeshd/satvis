




# https://celestrak.com/satcat/tle.php?CATNR=44057

oneweb = [44057, 44058, 44059, 44060, 44061, 44062]
starlink = range(44235, 44294+1)
gx = [39476, 40384, 40882, 42698]

import urllib.request

def main(ids):
    for id in ids:
        with urllib.request.urlopen("https://celestrak.com/satcat/tle.php?CATNR=%s"%id) as f:
            contents = f.read().decode('utf-8')

        b = contents.find('<pre>')
        e = contents.find('</pre')
        contents = contents[b+6:e].strip()

        print(contents)

if __name__=='__main__':
    main(gx)
