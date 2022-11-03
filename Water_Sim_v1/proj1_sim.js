/*
 * Global variables
 */
var meshResolution;

// Particle states
var mass;
const cubeMass = .1;
var vertexPosition, vertexNormal;
var vertexVelocity;
var vertexPositionCur;
var vertexVelocityCur;
var cubeV, CubeVertexNormal;
var CubeVCur, gravityFCube;

var collidingVertices;
var vertexForce;

// Spring properties
var K, restLength; 

// Force parameters
var Cd;
var uf, Cv;

/*
 * Getters and setters
 */
function getPosition(i, j) {
    var id = i*meshResolution + j;
    return vec3.create([vertexPosition[3*id], vertexPosition[3*id + 1], vertexPosition[3*id + 2]]);
}

function setPosition(i, j, x) {
    var id = i*meshResolution + j;
    vertexPosition[3*id] = x[0]; vertexPosition[3*id + 1] = x[1]; vertexPosition[3*id + 2] = x[2];
}

function getNormal(i, j) {
    var id = i*meshResolution + j;
    return vec3.create([vertexNormal[3*id], vertexNormal[3*id + 1], vertexNormal[3*id + 2]]);
}

function getVelocity(i, j) {
    var id = i*meshResolution + j;
    return vec3.create(vertexVelocity[id]);
}

function setVelocity(i, j, v) {
    var id = i*meshResolution + j;
    vertexVelocity[id] = vec3.create(v);
}


/*
 * Provided global functions (you do NOT have to modify them)
 */
function computeNormals() {
    var dx = [1, 1, 0, -1, -1, 0], dy = [0, 1, 1, 0, -1, -1];
    var e1, e2;
    var i, j, k = 0, t;
    for ( i = 0; i < meshResolution; ++i )
        for ( j = 0; j < meshResolution; ++j ) {
            var p0 = getPosition(i, j), norms = [];
            for ( t = 0; t < 6; ++t ) {
                var i1 = i + dy[t], j1 = j + dx[t];
                var i2 = i + dy[(t + 1) % 6], j2 = j + dx[(t + 1) % 6];
                if ( i1 >= 0 && i1 < meshResolution && j1 >= 0 && j1 < meshResolution &&
                     i2 >= 0 && i2 < meshResolution && j2 >= 0 && j2 < meshResolution ) {
                    e1 = vec3.subtract(getPosition(i1, j1), p0);
                    e2 = vec3.subtract(getPosition(i2, j2), p0);
                    norms.push(vec3.normalize(vec3.cross(e1, e2)));
                }
            }
            e1 = vec3.create();
            for ( t = 0; t < norms.length; ++t ) vec3.add(e1, norms[t]);
            vec3.normalize(e1);
            vertexNormal[3*k] = e1[0];
            vertexNormal[3*k + 1] = e1[1];
            vertexNormal[3*k + 2] = e1[2];
            ++k;
        }
}

function computeCubeNormals() {
    var dx = [1, 1, 0, -1, -1, 0], dy = [0, 1, 1, 0, -1, -1];
    var e1, e2;
    var i, j, k = 0, t;
    for ( i = 0; i < 6; ++i )
        for ( j = 0; j < 6; ++j ) {
            var p0 = vec3.create([cubePositions[(i*6)+j], cubePositions[(i*6)+j+1], cubePositions[(i*6)+j+2]]);
            var norms = [];
            //var p0 = getPosition(i, j), norms = [];
            for ( t = 0; t < 6; ++t ) {
                var i1 = i + dy[t], j1 = j + dx[t];
                var i2 = i + dy[(t + 1) % 6], j2 = j + dx[(t + 1) % 6];
                let ij1 = vec3.create([cubePositions[(i1*6)+j1], cubePositions[(i1*6)+j1+1], cubePositions[(i1*6)+j1+2]]);
                let ij2 = vec3.create([cubePositions[(i2*6)+j2], cubePositions[(i2*6)+j2+1], cubePositions[(i2*6)+j2+2]]);

                if ( i1 >= 0 && i1 < 6 && j1 >= 0 && j1 < 6 &&
                     i2 >= 0 && i2 < 6 && j2 >= 0 && j2 < 6 ) {
                    //e1 = vec3.subtract(getPosition(i1, j1), p0);
                    //e2 = vec3.subtract(getPosition(i2, j2), p0);
                    e1 = vec3.subtract(ij1, p0);
                    e2 = vec3.subtract(ij2, p0);
                    norms.push(vec3.normalize(vec3.cross(e1, e2)));
                }
            }
            e1 = vec3.create();
            for ( t = 0; t < norms.length; ++t ) vec3.add(e1, norms[t]);
            vec3.normalize(e1);
            CubeVertexNormal[3*k] = e1[0];
            CubeVertexNormal[3*k + 1] = e1[1];
            CubeVertexNormal[3*k + 2] = e1[2];
            ++k;
        }
}

var clothIndex, clothWireIndex;
var cubePositions, indices, curCubePositions, staticCubePositions;
var cubecolors = [];

function initMesh() {
    var i, j, k;
    cubeVel = vec3.create();
    gravityFCube = vec3.create([0,-9.8*cubeMass,0]);
    collidingVertices = new Array(meshResolution*meshResolution);
    vertexPosition = new Array(meshResolution*meshResolution*3);
    vertexNormal = new Array(meshResolution*meshResolution*3);
    CubeVertexNormal = new Array(36*3);
    clothIndex = new Array((meshResolution - 1)*(meshResolution - 1)*6);
    vertexPositionCur = new Array(meshResolution*meshResolution*3);
    vertexVelocityCur = new Array(meshResolution*meshResolution);
    vertexForce = new Array(meshResolution*meshResolution);
    clothWireIndex = [];

    for ( i = 0; i < meshResolution*meshResolution; ++i ){
        collidingVertices[i] = false;
    }

    vertexVelocity = new Array(meshResolution*meshResolution);
    restLength[0] = 4.0/(meshResolution - 1);
    restLength[1] = Math.sqrt(2.0)*4.0/(meshResolution - 1);
    restLength[2] = 2.0*restLength[0];
    for ( i = 0; i < meshResolution; ++i )
        for ( j = 0; j < meshResolution; ++j ) {
            setPosition(i, j, [-2.0 + 4.0*j/(meshResolution - 1), 0.0, -2.0 + 4.0*i/(meshResolution - 1)]);
            setVelocity(i, j, vec3.create());

            if ( j < meshResolution - 1 )
                clothWireIndex.push(i*meshResolution + j, i*meshResolution + j + 1);
            if ( i < meshResolution - 1 )
                clothWireIndex.push(i*meshResolution + j, (i + 1)*meshResolution + j);
            if ( i < meshResolution - 1 && j < meshResolution - 1 )
                clothWireIndex.push(i*meshResolution + j, (i + 1)*meshResolution + j + 1);
        }
    computeNormals();

    k = 0;
    for ( i = 0; i < meshResolution - 1; ++i )
        for ( j = 0; j < meshResolution - 1; ++j ) {
            clothIndex[6*k] = i*meshResolution + j;
            clothIndex[6*k + 1] = i*meshResolution + j + 1;
            clothIndex[6*k + 2] = (i + 1)*meshResolution + j + 1;
            clothIndex[6*k + 3] = i*meshResolution + j;
            clothIndex[6*k + 4] = (i + 1)*meshResolution + j + 1;            
            clothIndex[6*k + 5] = (i + 1)*meshResolution + j;
            ++k;
        }

    // cube init
    // Now create an array of positions for the cube.
    cubePositions = [
      // Front face
      -0.25,  0.75,  0.25,
       0.25,  0.75,  0.25,
       0.25,  1.25,  0.25,
      -0.25,  1.25,  0.25,

      // Back face
      -0.25,  0.75, -0.25,
      -0.25,  1.25, -0.25,
       0.25,  1.25, -0.25,
       0.25,  0.75, -0.25,

      // Top face
      -0.25,  1.25, -0.25,
      -0.25,  1.25,  0.25,
       0.25,  1.25,  0.25, // max bounding box index 30, 31, 32
       0.25,  1.25, -0.25,

      // Bottom face
      -0.25, 0.75, -0.25, // min bounding box index 36, 37, 38
       0.25, 0.75, -0.25,
       0.25, 0.75,  0.25,
      -0.25, 0.75,  0.25,

      // Right face
       0.25, 0.75, -0.25,
       0.25,  1.25, -0.25,
       0.25,  1.25,  0.25,
       0.25, 0.75,  0.25,

      // Left face
      -0.25, 0.75, -0.25,
      -0.25, 0.75,  0.25,
      -0.25,  1.25,  0.25,
      -0.25,  1.25, -0.25,
    ];

    curCubePositions = new Array(cubePositions.length);

    for ( i = 1; i < cubePositions.length; i+=3){
        cubePositions[i] += 1; // y tranlation
    }

    indices = [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ];
    computeCubeNormals();
    
    staticCubePositions = [
      // Front face
      -0.25,  0.75,  0.25,
       0.25,  0.75,  0.25,
       0.25,  1.25,  0.25,
      -0.25,  1.25,  0.25,

      // Back face
      -0.25,  0.75, -0.25,
      -0.25,  1.25, -0.25,
       0.25,  1.25, -0.25,
       0.25,  0.75, -0.25,

      // Top face
      -0.25,  1.25, -0.25,
      -0.25,  1.25,  0.25,
       0.25,  1.25,  0.25, // max bounding box index 30, 31, 32
       0.25,  1.25, -0.25,

      // Bottom face
      -0.25, 0.75, -0.25, // min bounding box index 36, 37, 38
       0.25, 0.75, -0.25,
       0.25, 0.75,  0.25,
      -0.25, 0.75,  0.25,

      // Right face
       0.25, 0.75, -0.25,
       0.25,  1.25, -0.25,
       0.25,  1.25,  0.25,
       0.25, 0.75,  0.25,

      // Left face
      -0.25, 0.75, -0.25,
      -0.25, 0.75,  0.25,
      -0.25,  1.25,  0.25,
      -0.25,  1.25, -0.25,
    ];
    for ( i = 1; i < staticCubePositions.length; i+=3){
        staticCubePositions[i] += -0.5; // y tranlation
    }
    // add translation
    for (var  i = 0; i < cubePositions.length; ++i){
        if (i % 3 == 0){ // x translation
            staticCubePositions[i] += 1.7;

        }
    }

}


/*
 * KEY function: simulate one time-step using Euler's method
 */
function simulate(stepSize) {
    CubeVCur = cubeVel; // store the past cube Velocity

    // calculate future cube position
    let fmCube = vec3.create([0,0,0]);

    fmCube[0] = gravityFCube[0]/cubeMass;
    fmCube[1] = gravityFCube[1]/cubeMass;
    fmCube[2] = gravityFCube[2]/cubeMass;

    fmCube[0] = fmCube[0]*stepSize;
    fmCube[1] = fmCube[1]*stepSize;
    fmCube[2] = fmCube[2]*stepSize;
    
    cubeVel[0] = CubeVCur[0] + fmCube[0];
    cubeVel[1] = CubeVCur[1] + fmCube[1];
    cubeVel[2] = CubeVCur[2] + fmCube[2];
    /*
    // save future cube position
    for ( i = 0; i < cubePositions.length; i+=3){
        let cubeP = vec3.create([cubePositions[i], cubePositions[i+1], cubePositions[i+2]]);
        curCubePositions[i]   = cubeP[0] + (cubeVel[0]*stepSize);
        curCubePositions[i+1] = cubeP[1] + (cubeVel[1]*stepSize);
        curCubePositions[i+2] = cubeP[2] + (cubeVel[2]*stepSize);
    }
    */

    // save cube positions
    for ( i = 0; i < cubePositions.length; i+=3){
        let cubeP = vec3.create([cubePositions[i], cubePositions[i+1], cubePositions[i+2]]);
        cubePositions[i]   = cubeP[0] + (cubeVel[0]*stepSize);
        cubePositions[i+1] = cubeP[1] + (cubeVel[1]*stepSize);
        cubePositions[i+2] = cubeP[2] + (cubeVel[2]*stepSize);
    }

    // plane cloth simulation
    var i, j;
    var gravityF = vec3.create([0,0*mass,0]); //Gravity

    // storing current cloth vertices position
    for ( i = 0; i < meshResolution; ++i ){
        for ( j = 0; j < meshResolution; ++j ) {
            let cpos = getPosition(i, j);
            let cvel= getVelocity(i, j);
            setTempPosition(i, j, cpos);
            setTempVelocity(i, j, cvel);
        }
    }

    // storing a mask of all vertices in the cloth touching the objects
    for ( i = 0; i < meshResolution*meshResolution; ++i ){
        collidingVertices[i] = false;
    }
    // calculate future position and velocity
    for ( i = 1; i < meshResolution-1; ++i ){
        for ( j = 0; j < meshResolution; ++j ) {
            //do not modify pinned particles
            let pin = j == 0 || j == meshResolution-1;
            if (!(pin)){
                let curV = getTempVelocity(i,j);
                let curP = getTempPosition(i,j);

                //=============Calculating Forces==========

                //Damping
                let dampF = vec3.create();
                dampF[0] = curV[0]*-Cd;
                dampF[1] = curV[1]*-Cd;
                dampF[2] = curV[2]*-Cd;

                //SPRINGS

                //Structural [i,j+1] , [i,j−1], [i+1,j], [i−1,j]
                let ijjF = vec3.create([0,0,0]);
                let ij0F = vec3.create([0,0,0]);
                let iijF = vec3.create([0,0,0]);
                let i0jF = vec3.create([0,0,0]);

                if(j+1 <= meshResolution-1){
                    let ijj = getTempPosition(i,j+1);
                    ijjF = calcSpringF(curP,ijj,restLength[0],K[0]);
                }

                if(j-1 >= 0){
                    let ij0 = getTempPosition(i,j-1);
                    ij0F = calcSpringF(curP,ij0,restLength[0],K[0]);
                }

                if(i+1 <= meshResolution-1){
                    let iij = getTempPosition(i+1,j);
                    iijF = calcSpringF(curP,iij,restLength[0],K[0]);
                }

                if(i-1 >= 0){
                    let i0j = getTempPosition(i-1,j);
                    i0jF = calcSpringF(curP,i0j,restLength[0],K[0]);
                }

                let strucF = vec3.create();
                strucF[0] = ijjF[0] + ij0F[0] + iijF[0] + i0jF[0];
                strucF[1] = ijjF[1] + ij0F[1] + iijF[1] + i0jF[1];
                strucF[2] = ijjF[2] + ij0F[2] + iijF[2] + i0jF[2];

                //Shear [i+1,j+1] , [i+1,j−1], [i−1,j−1], [i−1,j+1]
                let iijjF = vec3.create([0,0,0]);
                let iij0F = vec3.create([0,0,0]);
                let i0j0F = vec3.create([0,0,0]);
                let i0jjF = vec3.create([0,0,0]);

                if(i+1 <= meshResolution-1 && j+1 <= meshResolution-1){
                    let iijj = getTempPosition(i+1,j+1);
                    iijjF = calcSpringF(curP,iijj,restLength[1],K[1]);
                }

                if(i+1 <= meshResolution-1 && j-1 >= 0){
                    let iij0 = getTempPosition(i+1,j-1);
                    iij0F = calcSpringF(curP,iij0,restLength[1],K[1]);
                }

                if(i-1 >= 0 && j-1 >= 0){
                    let i0j0 = getTempPosition(i-1,j-1);
                    i0j0F = calcSpringF(curP,i0j0,restLength[1],K[1]);
                }

                if(i-1 >= 0 && j+1 <= meshResolution-1){
                    let i0jj = getTempPosition(i-1,j+1);
                    i0jjF = calcSpringF(curP,i0jj,restLength[1],K[1]);
                }

                let sheerF = vec3.create();
                sheerF[0] = iijjF[0] + iij0F[0] + i0j0F[0] + i0jjF[0];
                sheerF[1] = iijjF[1] + iij0F[1] + i0j0F[1] + i0jjF[1];
                sheerF[2] = iijjF[2] + iij0F[2] + i0j0F[2] + i0jjF[2];

                //Flexion [i,j+2], [i,j−2], [i+2,j], [i−2,j]
                let ij2F = vec3.create([0,0,0]);
                let ij02F = vec3.create([0,0,0]);
                let i2jF = vec3.create([0,0,0]);
                let i02jF = vec3.create([0,0,0]);

                if(j+2 <= meshResolution-1){
                    let ij2 = getTempPosition(i,j+2);
                    ij2F = calcSpringF(curP,ij2,restLength[2],K[2]);
                }

                if(j-2 >= 0){
                    let ij02 = getTempPosition(i,j-2);
                    ij02F = calcSpringF(curP,ij02,restLength[2],K[2]);
                }

                if(i+2 <= meshResolution-1){
                    let i2j = getTempPosition(i+2,j);
                    i2jF = calcSpringF(curP,i2j,restLength[2],K[2]);
                }

                if(i-2 >= 0){
                    let i02j = getTempPosition(i-2,j);
                    i02jF = calcSpringF(curP,i02j,restLength[2],K[2]);
                }

                let flexF = vec3.create();
                flexF[0] = ij2F[0] + ij02F[0] + i2jF[0] + i02jF[0];
                flexF[1] = ij2F[1] + ij02F[1] + i2jF[1] + i02jF[1];
                flexF[2] = ij2F[2] + ij02F[2] + i2jF[2] + i02jF[2];

                //END SPRINGS

                //Viscous
                let curN = getNormal(i,j);
                let visF = vec3.create();
                //visF[0] = Cv * curN[0] * curN[0] * (uf[0] - curV[0]);
                //visF[1] = Cv * curN[1] * curN[1] * (uf[1] - curV[1]);
                //visF[2] = Cv * curN[2] * curN[2] * (uf[2] - curV[2]);

                //===========Add all forces==========
                let forces = vec3.create();
                forces[0] = gravityF[0] + dampF[0] + strucF[0] + sheerF[0] + flexF[0] + visF[0];
                forces[1] = gravityF[1] + dampF[1] + strucF[1] + sheerF[1] + flexF[1] + visF[1];
                forces[2] = gravityF[2] + dampF[2] + strucF[2] + sheerF[2] + flexF[2] + visF[2];

                //colliding with falling cube
                if (renderfalingcube){
                    let collisionF = collision(i,j,gravityFCube,forces);   
                    forces[0] += collisionF[0];
                    forces[1] += collisionF[1];
                    forces[2] += collisionF[2];
                }

                //===========if clicked ==========
                if (click && Math.abs(0 - curP[0]) < 0.2 && Math.abs(0 - curP[1]) < 0.2 && Math.abs(1-curP[2]) < 0.2){
                    forces[1] = forces[1] - 1000;
                }
                
                
                //forces/mass 
                let fm = vec3.create();
                fm[0] = forces[0]/(mass+cubeMass); // mass plus cube mass maybe
                fm[1] = forces[1]/(mass+cubeMass);
                fm[2] = forces[2]/(mass+cubeMass);
                
                fm[0] = fm[0]*stepSize;
                fm[1] = fm[1]*stepSize;
                fm[2] = fm[2]*stepSize;

                //changing velocity
                let newV = vec3.create();

                newV[0] = curV[0] + fm[0];
                newV[1] = curV[1] + fm[1];
                newV[2] = curV[2] + fm[2];

                //changing position
                let newP = vec3.create();

                newP[0] = curP[0] + (newV[0]*stepSize);
                newP[1] = curP[1] + (newV[1]*stepSize);
                newP[2] = curP[2] + (newV[2]*stepSize);

                //set final postition and speed

                setVelocity(i,j,newV);
                setPosition(i,j,newP);
            }
        }
    }

    /*

    // recompute the position of the cube using clothes forces
    let fCube = gravityFCube;
    let count = 0;
    //find average velocity of the colliding area
    for ( i = 0; i < meshResolution*meshResolution; ++i ){
        if (collidingVertices[i]){
            //avegVel += vertexVelocityCur[i];
            //console.log(vertexVelocityCur[i]);
            //count += 1;
            console.log("vertexForce this will be added to the cube");
            console.log(vertexForce[i]);
            fCube[0] = fCube[0] - vertexForce[i][0];
            fCube[1] = fCube[1] - vertexForce[i][1];
            fCube[2] = fCube[1] - vertexForce[i][2];
            count += 1;
            //console.log("fcube");
            //console.log(fCube);
        }
    }
    console.log(avegVel);
    if (count != 0){
        avegVel[0] = avegVel[0]/count;
        avegVel[1] = avegVel[1]/count;
        avegVel[2] = avegVel[2]/count;
    }
    console.log(avegVel);
        console.log(fCube);

    fmCube[0] = fCube[0]/(cubeMass + count*mass);
    fmCube[1] = fCube[1]/(cubeMass + count*mass);
    fmCube[2] = fCube[2]/(cubeMass + count*mass);

    fmCube[0] = fCube[0]*stepSize;
    fmCube[1] = fCube[1]*stepSize;
    fmCube[2] = fCube[2]*stepSize;
    
    cubeVel[0] = CubeVCur[0] + fmCube[0];
    cubeVel[1] = CubeVCur[1] + fmCube[1];
    cubeVel[2] = CubeVCur[2] + fmCube[2];

    //cubeVel[0] -= avegVel[0]; 
    //cubeVel[1] -= avegVel[1];
    //cubeVel[2] -= avegVel[2];
    
    // save cube positions
    for ( i = 0; i < cubePositions.length; i+=3){
        let cubeP = vec3.create([cubePositions[i], cubePositions[i+1], cubePositions[i+2]]);
        cubePositions[i]   = cubeP[0] + (cubeVel[0]*stepSize);
        cubePositions[i+1] = cubeP[1] + (cubeVel[1]*stepSize);
        cubePositions[i+2] = cubeP[2] + (cubeVel[2]*stepSize);
    }
    */

    click = false;

}

function collision(x,y,F,forces){
    let pos = getTempPosition(x,y);
    let vel = getTempVelocity(x,y);
    let i;

    //let maxC = vec3.create([curCubePositions[30], curCubePositions[31], curCubePositions[32]]); //cube min
    //let minC = vec3.create([curCubePositions[36], curCubePositions[37], curCubePositions[38]]); //cube max
    let maxC = vec3.create([cubePositions[30], cubePositions[31], cubePositions[32]]); //cube min
    let minC = vec3.create([cubePositions[36], cubePositions[37], cubePositions[38]]); //cube max

    // find all coliding vertices on the cube
    if (insideBox(pos, minC, maxC)){
        //console.log(forces);
        //console.log("forces:")
        //console.log(forces);
        collidingVertices[(x*meshResolution)+y] = true;
        //vertexForce[(x*meshResolution)+y] = vec3.create([forces[0],forces[1],forces[2]]);
        vertexForce[(x*meshResolution)+y] = vec3.create([0,0,0]);
        //return F;
        return vec3.create([0,-900.8*cubeMass,0]);
    }
    return vec3.create([0,0,0]);
}

function any(boolean) {
  return boolean;
}

function insideBox(coor, min, max){
    let x = min[0] <= coor[0] && coor[0] <= max[0];
    let y = min[1] <= coor[1] && coor[1] <= max[1];
    let z = min[2] <= coor[2] && coor[2] <= max[2];
    if (x && y && z){
        return true;
    } else{
        return false;
    }
}

function calcSpringF(p,q,L,stiff){
    //calculate division
    let pminq = vec3.create();
    pminq[0] = p[0] - q[0];
    pminq[1] = p[1] - q[1];
    pminq[2] = p[2] - q[2];

    let lpq = vec3.length(pminq);
    let div = vec3.normalize(pminq)

    //calculate parenthesis *K
    let leftequation = stiff*(L-lpq);

    //calc everything
    div[0] = leftequation * div[0];
    div[1] = leftequation * div[1];
    div[2] = leftequation * div[2];

    return div;
}


function setTempPosition(i, j, x) {
    var id = i*meshResolution + j;
    vertexPositionCur[3*id] = x[0]; vertexPositionCur[3*id + 1] = x[1]; vertexPositionCur[3*id + 2] = x[2];
}
function getTempPosition(i, j) {
    var id = i*meshResolution + j;
    return vec3.create([vertexPositionCur[3*id], vertexPositionCur[3*id + 1], vertexPositionCur[3*id + 2]]);
}

function setTempVelocity(i, j, v) {
    var id = i*meshResolution + j;
    vertexVelocityCur[id] = vec3.create(v);
}

function getTempVelocity(i, j) {
    var id = i*meshResolution + j;
    return vec3.create(vertexVelocityCur[id]);
}


