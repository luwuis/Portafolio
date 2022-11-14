import csv
import matplotlib.patches as patches
from scipy import ndimage
import skimage as ski 
from scipy import ndimage
import numpy as np
import matplotlib.pyplot as plt


def mygradient(image):
    """
    This function takes a grayscale image and returns two arrays of the
    same size, one containing the magnitude of the gradient, the second
    containing the orientation of the gradient.
    
    
    Parameters
    ----------
    image : 2D float array of shape HxW
         An array containing pixel brightness values
    
    Returns
    -------
    mag : 2D float array of shape HxW
        gradient magnitudes
        
    ori : 2Dfloat array of shape HxW
        gradient orientations in radians
    """
    
    # your code goes here
    mag = np.zeros((image.shape[0],image.shape[1]))
    ori = np.zeros((image.shape[0],image.shape[1]))
    dy = np.zeros((image.shape[0],image.shape[1]))
    dx = np.zeros((image.shape[0],image.shape[1]))
    
    yfil = [[-1, 0],
            [1, 0]]
    xfil = [[-1, 1],
            [0, 0]]
    
    dy = ndimage.correlate(image, yfil, mode = 'nearest')
    dx = ndimage.correlate(image, xfil, mode = 'nearest')
    
    for h in range(image.shape[0]):
        for w in range(image.shape[1]):
            if dx[h,w] == 0:
                ori[h,w] = np.arctan(dy[h,w]/1e-10)
            else:
                ori[h,w] = np.arctan(dy[h,w]/dx[h,w])
            mag[h,w] = np.sqrt( (dx[h,w]**2) + (dy[h,w]**2) )

    return (mag,ori)


def hog(image,bsize=8,norient=9):
    
    """
    This function takes a grayscale image and returns a 3D array
    containing the histogram of gradient orientations descriptor (HOG)
    We follow the convention that the histogram covers gradients starting
    with the first bin at -pi/2 and the last bin ending at pi/2.
    
    Parameters
    ----------
    image : 2D float array of shape HxW
         An array containing pixel brightness values
    
    bsize : int
        The size of the spatial bins in pixels, defaults to 8
        
    norient : int
        The number of orientation histogram bins, defaults to 9
        
    Returns
    -------
    ohist : 3D float array of shape (H/bsize,W/bsize,norient)
        edge orientation histogram
        
    """   
    
    # determine the size of the HOG descriptor
    (h,w) = image.shape
    h2 = int(np.ceil(h/float(bsize)))
    w2 = int(np.ceil(w/float(bsize)))
    ohist = np.zeros((h2,w2,norient))
    
    # pad the input image on right and bottom as needed so that it 
    # is a multiple of bsize
    if bsize-(w%bsize) == bsize:
        pw = (0,0)
    else:
        pw = (0,( bsize-(w%bsize) )) #amounts to pad on left and right side
        
    if bsize-(h%bsize) == bsize:
        ph = (0,0)
    else:
        ph = (0,bsize-(h%bsize)) #amounts to pad on bottom and top side

    image = np.pad(image,(ph,pw),'edge')
    # make sure we did the padding correctly
    assert(image.shape==(h2*bsize,w2*bsize))

    # compute image gradients
    (mag,ori) = mygradient(image)
    
    # choose a threshold which is 10% of the maximum gradient magnitude in the image
    thresh = np.max(mag)*0.1
    
    # separate out pixels into orientation channels, dividing the range of orientations
    # [-pi/2,pi/2] into norient equal sized bins and count how many fall in each block    
    binEdges = np.linspace(-np.pi/2, np.pi/2, norient+1);
    
    # as a sanity check, make sure every pixel gets assigned to at most 1 bin.
    bincount = np.zeros((h2*bsize,w2*bsize))
    for i in range(norient):
        #create a binary image containing 1s for pixels at the ith 
        #orientation where the magnitude is above the threshold.
        b0 = np.greater(mag, thresh)
        b1 = np.greater_equal(ori, binEdges[i])
        if i == norient-1:
            b2 = np.less(ori, np.pi/2) 
        else:
            b2 = np.less(ori, binEdges[i+1]) 
        B = b0 & b1 & b2
        
        #sanity check: record which pixels have been selected at this orientation
        bincount = bincount + B
        #pull out non-overlapping bsize x bsize blocks
        chblock = ski.util.view_as_windows(B,(bsize,bsize),step=bsize)

        #sum up the count for each block and store the results
        blocksum = np.sum(chblock,axis=(2,3))
        ohist[:,:,i] = blocksum
        
    #each pixel should have only selected at most once
    assert(np.all(bincount<=1))

    # lastly, normalize the histogram so that the sum along the orientation dimension is 1
    # note: don't divide by 0! If there are no edges in a block (i.e. the sum of counts
    # is 0) then your code should leave all the values as zero. 
    
    for h in range(ohist.shape[0]):
        for w in range(ohist.shape[1]):
            total = np.sum(ohist[h,w])
            if total != 0:
                ohist[h,w] = ohist[h,w]/total
                
    assert(ohist.shape==(h2,w2,norient))
    
    return ohist


def detect(image,template,ndetect=5,bsize=8,norient=9):
    
    """
    This function takes a grayscale image and a HOG template and
    returns a list of detections where each detection consists
    of a tuple containing the coordinates and score (x,y,score)
    
    Parameters
    ----------
    image : 2D float array of shape HxW
         An array containing pixel brightness values
    
    template : a 3D float array 
        The HOG template we wish to match to the image
        
    ndetect : int
        Maximum number of detections to return

    bsize : int
        The size of the spatial bins in pixels, defaults to 8
        
    norient : int
        The number of orientation histogram bins, defaults to 9
    
    Returns
    -------
    detections : a list of tuples of length ndetect
        Each detection is a tuple (x,y,score)
        
    """   
    # norient for the template should match the norient parameter passed in
    assert(template.shape[2]==norient)
    
    fmap = hog(image,bsize=bsize,norient=norient)
    
    #cross-correlate the template with the feature map to get the total response
    resp = np.zeros((fmap.shape[0],fmap.shape[1]))
    for i in range(norient):
        resp = resp + ndimage.correlate(fmap[:,:,i], template[:,:,i])
    
    
    #sort the values in resp in descending order.
    # val[i] should be ith largest score in resp
    # ind[i] should be the index at which it occurred so that val[i]==resp[ind[i]]
    # 
    val = []  #sorted response values
    ind = []  #corresponding indices
    sort = np.copy(resp)
    for i in range(sort.shape[0]*sort.shape[1]):
        ind.append(np.unravel_index(np.argmax(sort, axis=None), sort.shape))
        val.append(sort[ind[i]])
        sort[ind[i]] = 0
    
    #work down the list of responses from high to low, to generate a 
    # list of ndetect top scoring matches which do not overlap
    detcount = 0
    i = 0
    detections = []
    threshold = template.shape[1]*bsize*.7
    while ((detcount < ndetect) and (i < len(val))):
        # convert 1d index into 2d index
        yb = ind[i][0]
        xb = ind[i][1]

        assert(val[i]==resp[yb,xb]) #make sure we did indexing correctly
        
        #covert block index to pixel coordinates based on bsize
        xp = xb*bsize
        yp = yb*bsize
    
        #check if this detection overlaps any detections that we've already added
        #to the list. compare the x,y coordinates of this detection to the x,y 
        #coordinates of the detections already in the list and see if any overlap
        #by checking if the distance between them is less than 70% of the template
        # width/height
        overlap = False
        if len(detections) != 0:
            for detection in detections:
                dist = np.sqrt((detection[0] - xp)**2 + (detection[1] - yp)**2)
                if dist < threshold:
                    overlap = True
                    
        #if the detection doesn't overlap then add it to the list
        if not overlap:
            detcount = detcount + 1
            detections.append((xp,yp,val[i]))
        
        i=i+1
    
    if (len(detections) < ndetect):
        print('WARNING: unable to find ',ndetect,' non-overlapping detections')
        
    return detections


def plot_detections(image,detections,tsize_pix):
    """
    This is a utility function for visualization that takes an image and
    a list of detections and plots the detections overlayed on the image
    as boxes.
    
    Color of the bounding box is based on the order of the detection in
    the list, fading from green to red.
    
    Parameters
    ----------
    image : 2D float array of shape HxW
         An array containing pixel brightness values
    
    detections : a list of tuples of length ndetect
        Detections are tuples (x,y,score)

    tsize_pix : (int,int)
        The height and width of the box in pixels
    
    Returns
    -------
    None
    
    """           
    ndetections = len(detections)
    
    plt.imshow(image,cmap=plt.cm.gray)
    ax = plt.gca()
    w = tsize_pix[1]
    h = tsize_pix[0]
    red = np.array([1,0,0])
    green = np.array([0,1,0])
    ct = 0
    for (x,y,score) in detections:
        xc = x-(w//2)
        yc = y-(h//2)
        col = (ct/ndetections)*red + (1-(ct/ndetections))*green
        rect = patches.Rectangle((xc,yc),w,h,linewidth=3,edgecolor=col,facecolor='none')
        ax.add_patch(rect)
        ct = ct + 1
        
    plt.show()


def main():    
    with open('face_template.csv', 'r') as f:
      reader = csv.reader(f)
      examples = list(reader)

        
    fromcsv = []

    for row in examples:
        nwrow = []
        for r in row:
            nwrow.append(eval(r))
        fromcsv.append(nwrow)

    fromcsv = np.array(fromcsv)
    detections = detect(imgtest1,fromcsv,ndetect=8)
    plot_detections(imgtest1,detections,tsize_pix)


if __name__ == '__main__':
    main()
    pass
