#!/usr/bin/env python3

from math import sqrt, pi

R_EARTH = 6378.137
GM = 398600.4418
SECONDS_IN_A_DAY = 86400.000

def walker(prefix, i, t, p, f, altitude, tap, tap0 = 0, satnum0 = 80000):
    '''
    i: inclination
    t: total number of satellites
    p: number of equally spaced planes
    f: relative spacing between satellites in adjacent planes (∆RAAN)
    altitude: nominal altitude in km; I feel like I should not need this
    tap: true anomaly phasing
    '''
    ret = ''
    satnum = 1
    sats_per_plane = int(t/p)
    ascension_per_plane = f

    for plane in range(p):
        initial_anomaly = tap0 + tap * plane
        for sat in range(sats_per_plane):
            satnum = satnum0 + (plane+1)*100 + (sat+1)
            anomaly = initial_anomaly + sat * (360.0 / sats_per_plane)
            perigee = 0
            motion = SECONDS_IN_A_DAY/sqrt(4*pi*pi*(R_EARTH+altitude)**3/GM)
            ret += prefix+'_{:0>2}_{:0>2}\n'.format(plane+1, sat+1)
            ret += format_tle(satnum, 19, i, plane * ascension_per_plane, 10, perigee, anomaly, motion)

    return ret

def format_tle(satnum, epoch_year, inclination, right_ascension, eccentricity, perigee, mean_anomaly, mean_motion):
    # FIXME fake checksums
    intl_designator = ' '
    epoch_day = 1
    epoch_day_fraction = 0
    line1 = '1 {:0>5}  {:8} {:0>2}{:0>3}.{:0>8} -.00000000  00000-0  00000-0 0 00009\n'.format(satnum, intl_designator, epoch_year, epoch_day, epoch_day_fraction)
    line2 = '2 {:0>5} {:08.4f} {:08.4f} {:0>7} {:08.4f} {:08.4f} {:11.8f}000009\n'.format(satnum, inclination%360, right_ascension%360, eccentricity, perigee%360, mean_anomaly%360, mean_motion)
    return line1+line2

if __name__=='__main__':
    import sys
    if len(sys.argv)<8:
        print('''Usage: gen-tle.py prefix inclination #sat #planes delta-RAAN altitude TAP [tap0=0] [satnum0=80000]

Generates TLE data for a Walker Delta constellation.
    i: t/p/f --> inclination #sat #planes delta-RAAN
    altitude: in km

eg: For the planned OneWeb system:

    gen-tle.py I 86.4 40*18 18 10 1200 3.3''')
        sys.exit(1)

    cmd = 'walker("'+sys.argv[1]+'", '+', '.join(sys.argv[2:])+')'
    ret = eval(cmd)
    print(ret)
