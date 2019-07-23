from math import sqrt, pi

# https://www.astrome.co/blogs/the-art-of-satellite-constellation-design-what-you-need-to-know/

'''
I_01_02
1 80102           17001.00000000 -.00000000  00000-0  00000-0 0 00004
2 80102 050.0000 000.0000 0000010 360.0000 032.7273 12.77881267000001
I_01_03
1 80103           17001.00000000 -.00000000  00000-0  00000-0 0 00005
2 80103 050.0000 000.0000 0000010 000.0000 065.4545 12.77881267000008
'''

def walker(i, t, p, f, altitude):
    '''
    i: inclination
    t: total number of satellites
    p: number of equally spaced planes
    f: relative spacing between satellites in adjacent planes
    altitude: nominal altitude in km; I feel like I should not need this
    '''
    ret = ''
    satnum = 1
    sats_per_plane = int(t/p)
    ascension_per_plane = 360.0 / p

    for plane in range(p):
        initial_anomaly = plane * f * 360.0 / t
        for sat in range(sats_per_plane):
            satnum = 80000 + (plane+1)*100 + (sat+1)
            anomaly = initial_anomaly + sat * (360.0 / sats_per_plane)
            perigee = 0 # inclined only
            motion = 86400.000/sqrt(4*pi*pi*(6378.137+altitude)**3/398600.4418)
            ret += 'I_{:0>2}_{:0>2}\n'.format(plane+1, sat+1)
            ret += format_tle(satnum, 17, i, plane * ascension_per_plane, 10, perigee, anomaly, motion)

    return ret

def format_tle(satnum, epoch_year, inclination, right_ascension, eccentricity, perigee, mean_anomaly, mean_motion):
    # FIXME fake checksums
    intl_designator = ' '
    epoch_day = 1
    epoch_day_fraction = 0
    line1 = '1 {:0>5}  {:8} {:0>2}{:0>3}.{:0>8} -.00000000  00000-0  00000-0 0 00009\n'.format(satnum, intl_designator, epoch_year, epoch_day, epoch_day_fraction)
    line2 = '2 {:0>5} {:08.4f} {:08.4f} {:0>7} {:08.4f} {:08.4f} {:11.8f}000009\n'.format(satnum, inclination, right_ascension, eccentricity, perigee, mean_anomaly, mean_motion)
    return line1+line2

if __name__=='__main__':
    ret = walker(50, 11*20, 20, 2.0166666666666666, 1350)
    print(ret)
