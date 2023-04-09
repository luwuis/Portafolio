function handleMouseMove(event) {
  var targets = window.document.getElementsByClassName("follower");
  const height = window.innerHeight;
  const width = window.innerWidth;
  const m = 40;
  let yAxisDegree, xAxisDegree, rect, y, x, dis;
  //console.log(event.clientX, ", ", event.clientY, " window: ", width, "x", height);
  for (var i = targets.length - 1; i >= 0; i--) {
    // calculate the position of each follower
    rect = targets[i].getBoundingClientRect();
    y = rect.bottom - ((rect.bottom - rect.top)/2); 
    x = rect.right - ((rect.right - rect.left)/2); 
    //console.log(rect.bottom, rect.top, rect.right, rect.left, pos);
    // Creates angles of (-20, -20) (left, bottom) and (20, 20) (right, top)
    //yAxisDegree = event.pageX / width * 40 - 20;
    //xAxisDegree = event.pageY / height * -1 * 40 + 20;
    yAxisDegree = ((event.clientX - x)/width)*90;
    xAxisDegree = ((y - event.clientY)/height)*90;

    dis = getDistance(x,y,event.clientX,event.clientY);
    //console.log(targets[i], dis) //, pos, rect.bottom, rect.top, rect.right, rect.left);

    // adds a max deg
    if (yAxisDegree > m) {
      yAxisDegree = m;
    } else if (yAxisDegree < -m) {
      yAxisDegree = -m;
    }
    if (xAxisDegree > m) {
      xAxisDegree = m;
    } else if (xAxisDegree < -m) {
      xAxisDegree = -m;
    }
    /*
    if (dis > 750) {
      xAxisDegree = 0;
      yAxisDegree = 0;
    }*/
    //console.log(xAxisDegree, yAxisDegree);
    targets[i].style.transform = `rotateY(${yAxisDegree}deg) rotateX(${xAxisDegree}deg)`;
  }
}

document.onmousemove = handleMouseMove;

//  <script type="text/javascript" src="./mouse_handler.js"></script>

function getDistance(x1, y1, x2, y2){
    let y = x2 - x1;
    let x = y2 - y1;
    
    return Math.sqrt(x * x + y * y);
}