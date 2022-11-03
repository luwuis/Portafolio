/* 
 * Initializing GL object
 */
var gl;
var refracionFBO, reflexionFBO;
var clip_plane, worldtexture, worldDepthtexture;
var click = false;
var x = 0.35;
var y = 0.75;
var renderfalingcube = true;
function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if ( !gl ) alert("Could not initialise WebGL, sorry :-(");

    gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError, validateNoneOfTheArgsAreUndefined);
    gl.canvas.addEventListener('click', (e) => {
       click = true;                                             
    });
}

/*
 * Initializing shaders 
 */
var shaderProgram, shaderSceneProgram;
function createShader(vs_id, fs_id, water) {
    var shaderProg = createShaderProg(vs_id, fs_id);

    shaderProg.vertexPositionAttribute = gl.getAttribLocation(shaderProg, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProg.vertexPositionAttribute);
    shaderProg.vertexNormalAttribute = gl.getAttribLocation(shaderProg, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProg.vertexNormalAttribute); 

    //buffersize

    if (water){
        shaderProg.buffersize = gl.getUniformLocation(shaderProg, "buffersize");
        shaderProg.reflexionTexture = gl.getUniformLocation(shaderProg, "reflexionTexture");
        shaderProg.refractionTexture = gl.getUniformLocation(shaderProg, "refractionTexture");
        
    } else {
        shaderProg.clipPlane = gl.getUniformLocation(shaderProg, "clipPlane");

    }
    
    shaderProg.pMatrixUniform = gl.getUniformLocation(shaderProg, "uPMatrix");
    shaderProg.mvMatrixUniform = gl.getUniformLocation(shaderProg, "uMVMatrix");
    shaderProg.nMatrixUniform = gl.getUniformLocation(shaderProg, "uNMatrix");
    shaderProg.lightPosUniform = gl.getUniformLocation(shaderProg, "uLightPos");

    return shaderProg;
}

function initShaders() {
    shaderSceneProgram = createShader("sceneShader-vs", "sceneShader-fs", false);
    shaderProgram = createShader("shader-vs", "shader-fs", true);
}

/*
 * Init the reflexion and refraction textures
 */
var reflextexture, refractiontexture, refractionDepthtexture, reflectionDepthBuffer;
function initReflexFramebuff(){
    // create frame buffer
    reflexionFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, reflexionFBO);

    // attach texture
    reflextexture = generateTexture(gl.viewportWidth,gl.viewportHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,reflextexture,0);

    // create Depth buffer
    reflectionDepthBuffer = createDepthBufferAt(gl.viewportWidth,gl.viewportHeight);

    // unbind buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}
function initRefractionFramebuff(){
    // create frame buffer
    refracionFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, refracionFBO);

    // attach texture
    refractiontexture = generateTexture(gl.viewportWidth,gl.viewportHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,refractiontexture,0);

    // create Depth texture
    refractionDepthtexture = generateTextureDepth(gl.viewportWidth,gl.viewportHeight)

    // unbind buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}

/*
 * Initializing and updating buffers
 */
var vertexPositionBuffer, vertexNormalBuffer, CubeVertexNormalBuffer, indexBuffer, wireIndexBuffer;
var positionBuffer, colorBuffer, CindexBuffer,staticPositionBuffer;


function initBuffers(createBuffers) {
    if ( createBuffers ) {
        vertexPositionBuffer = gl.createBuffer();
        vertexNormalBuffer = gl.createBuffer();  
        //CubeVertexNormalBuffer = gl.createBuffer();      
        indexBuffer = gl.createBuffer();
        wireIndexBuffer = gl.createBuffer();
        positionBuffer = gl.createBuffer();   //cube postion 
        staticPositionBuffer = gl.createBuffer();   // static cube postion 
        colorBuffer = gl.createBuffer(); // cube color
        CindexBuffer = gl.createBuffer(); // cube indices 
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(vertexPosition), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(vertexNormal), gl.DYNAMIC_DRAW);
    //gl.bindBuffer(gl.ARRAY_BUFFER, CubeVertexNormalBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(CubeVertexNormal), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint16Array.from(clothIndex), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint16Array.from(clothWireIndex), gl.STATIC_DRAW);   

    //cube code

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(cubePositions), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, staticPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(staticCubePositions), gl.DYNAMIC_DRAW);
    
    //gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(cubecolors), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, CindexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint16Array.from(indices), gl.STATIC_DRAW);

}

function updateBuffers() {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(vertexPosition), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(vertexNormal), gl.DYNAMIC_DRAW);    

    //cube update
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(cubePositions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, staticPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(staticCubePositions), gl.DYNAMIC_DRAW);
    //gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(cubecolors), gl.DYNAMIC_DRAW);
    //gl.bindBuffer(gl.ARRAY_BUFFER, CubeVertexNormalBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(CubeVertexNormal), gl.DYNAMIC_DRAW);
}

function resetMesh() {
    initMesh();
    initBuffers(false);   
}

/*
 * Main rendering code 
 */

// Basic rendering parameters
var mvMatrix = mat4.create();                   // Model-view matrix for the main object
var pMatrix = mat4.create();                    // Projection matrix

// Lighting control
var lightMatrix = mat4.create();                // Model-view matrix for the point light source
var lightPos = vec3.create();                   // Camera-space position of the light source

// Animation related variables
var rotY = 0.3;                                 // object rotation
var rotY_light = 0.5;                           // light position rotation

var buffsize = [];

function setWaterUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    
    gl.uniform2fv(shaderProgram.buffersize, buffsize);
    gl.uniform1i(shaderProgram.reflexionTexture, reflextexture);
    gl.uniform1i(shaderProgram.refractionTexture, refractiontexture);


    var nMatrix = mat4.transpose(mat4.inverse(mvMatrix));
    gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, nMatrix);

    gl.uniform3fv(shaderProgram.lightPosUniform, lightPos);
}

function setUniforms() {
    gl.uniformMatrix4fv(shaderSceneProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderSceneProgram.mvMatrixUniform, false, mvMatrix);
    
    gl.uniform4fv(shaderSceneProgram.clipPlane, clip_plane);

    var nMatrix = mat4.transpose(mat4.inverse(mvMatrix));
    gl.uniformMatrix4fv(shaderSceneProgram.nMatrixUniform, false, nMatrix);

    gl.uniform3fv(shaderSceneProgram.lightPosUniform, lightPos);
}

function setWorldReflex(){
    mat4.perspective(35, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(lightMatrix);
    mat4.translate(lightMatrix, [0.0, 0.5, -5.0]);
    //mat4.rotateX(lightMatrix, 0.3);
    mat4.rotateY(lightMatrix, rotY_light);

    lightPos.set([0.0, 2.5, -3.0]);
    mat4.multiplyVec3(lightMatrix, lightPos);

    mat4.identity(mvMatrix);

    //mat4.rotateX(mvMatrix, 0.3);
    //mat4.rotateY(mvMatrix, rotY); 
    mat4.rotateY(mvMatrix, 3.1416);
    mat4.translate(mvMatrix, [0.0, -.5, 10.0]); // translation of camera

    mat4.rotateX(mvMatrix, x); 
    mat4.rotateY(mvMatrix, -y); 


    //mat4.rotateX(mvMatrix, 1.6); 
    //mat4.rotateX(mvMatrix, 1.55); 
}

function setWorldPerspective(){
    mat4.perspective(35, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(lightMatrix);
    mat4.translate(lightMatrix, [0.0, 0.5, -5.0]);
    //mat4.rotateX(lightMatrix, 0.3);
    mat4.rotateY(lightMatrix, rotY_light);

    lightPos.set([0.0, 2.5, -3.0]);
    mat4.multiplyVec3(lightMatrix, lightPos);


    //mat4.rotateX(mvMatrix, 0.3);
    //mat4.rotateY(mvMatrix, rotY);

    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0.0, .5, -10.0]); // translation of camera

    mat4.rotateX(mvMatrix, x); 
    mat4.rotateY(mvMatrix, y); 

    //mat4.rotateX(mvMatrix, 1.6); 
    //mat4.rotateX(mvMatrix, 1.55); 
}

function bindRefraction(){
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, refracionFBO);
    gl.bindTexture(gl.TEXTURE_2D, refractiontexture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,refractiontexture,0);

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}
function bindReflexion(){
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, reflexionFBO);
    gl.bindTexture(gl.TEXTURE_2D, reflextexture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,reflextexture,0);

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}


var drawMode;
function drawScene() {
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    //=========================
    // get refraction
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    clip_plane = [0.0, 0.0, 0.0, 0.0]; // negative to do below water

    bindRefraction();
    // render scene to the fbo
    gl.clearColor(0.3, 0.6, 1.0, 1.0); // give color to water
    gl.clear(gl.COLOR_BUFFER_BIT);

    render_meshes(false,false);
    gl.flush();

    // unbind buffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,null,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    //=========================
    // get reflexion
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    clip_plane = [0.0, 1.0, 0.0, 0.0]; // positive to do avobe water

    bindReflexion();
    // render scene to the fbo
    gl.clearColor(0.3, 0.6, 1.0, 1.0); // give color to water
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    render_meshes(false,true);
    gl.flush();

    // unbind buffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,null,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    
    //=========================
    // render the scene
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // give color to sky
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    clip_plane = [0.0, 0.0, 0.0, 0.0];

    render_meshes(true,false);
 
}

var lastTime = 0;
var rotSpeed = 60, rotSpeed_light = 60;
var rotating = false, rotating_light = false;
var animated = true;
function tick() {
    requestAnimationFrame(tick);

    buffsize = [gl.viewportWidth, gl.viewportHeight];

    var timeNow = new Date().getTime();
    if ( lastTime != 0 ) {
      var elapsed = timeNow - lastTime;
      if ( rotating )
        rotY += rotSpeed*0.0175*elapsed/1000.0;
      if ( rotating_light )
        rotY_light += rotSpeed_light*0.0175*elapsed/1000.0;
    }

    lastTime = timeNow;        
    drawScene();

    if ( animated ) {
        var timeStep = 0.001;
        var n = Math.ceil(0.01/timeStep);
        for ( var i = 0; i < n; ++i ) simulate(timeStep);
        computeNormals();
        updateBuffers();
    }
}

function webGLStart() {
    var canvas = $("#canvas0")[0];

    meshResolution = 25;
    mass = 1.0;
    restLength = vec3.create();
    K = vec3.create([25000.0, 25000.0, 25000.0]);
    Cd = 0.5;
    uf = vec3.create([0.0, 0.0, 1.0]);
    Cv = 0.5;    

    initGL(canvas);
    initShaders();

    initMesh();
    initBuffers(true);
    var ext = gl.getExtension('WEBGL_depth_texture');
    initReflexFramebuff();
    initRefractionFramebuff();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    drawMode = 0;
    clip_plane = [0.0, 0.0, 0.0, 0.0];

    tick();
}



// texture load

function generateTexture(w,h) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,w, h, 0, gl.RGB, gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    return texture;
}
function generateTextureDepth(w,h) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT,w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,texture,0);
    return texture;
}

function createDepthBufferAt(w,h){
    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    return depthBuffer;
}

function render_meshes(water,inv){
    if (water){
        if (inv){
            setWorldReflex();
        } else{
            setWorldPerspective();
        }
        gl.useProgram(shaderProgram);     

        setWaterUniforms();

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

        if ( drawMode == 0 ) {
            // Normal mode
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);        
            gl.drawElements(gl.TRIANGLES, clothIndex.length, gl.UNSIGNED_SHORT, 0);
        }
        else {
            // Wire-frame mode
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIndexBuffer);        
            gl.drawElements(gl.LINES, clothWireIndex.length, gl.UNSIGNED_SHORT, 0);
        }
    } 

    const vertexCount = 36;
    if (renderfalingcube){
        // dynamic cube
        if (inv){
            setWorldReflex();
        } else{
            setWorldPerspective();
        }
        gl.useProgram(shaderSceneProgram);
        if (!inv)  {
            mat4.identity(mvMatrix);
            mat4.translate(mvMatrix, [0.0, .5, -10.0]); // translation of camera
            mat4.rotateX(mvMatrix, x); 
            mat4.rotateY(mvMatrix, y); 

        }
        setUniforms();   
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(shaderSceneProgram.vertexPositionAttribute,3,gl.FLOAT,false,0,0);
        //gl.bindBuffer(gl.ARRAY_BUFFER, CubeVertexNormalBuffer);
        //gl.vertexAttribPointer(shaderSceneProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
        

        if ( drawMode == 0 ) {
            // Normal mode
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, CindexBuffer);        
            gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
        }
        else {
            // Wire-frame mode
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, CindexBuffer);        
            gl.drawElements(gl.LINES, vertexCount, gl.UNSIGNED_SHORT, 0);
        }
    }

    // static cube
    if (inv){
        setWorldReflex();
    } else {
        setWorldPerspective();
    }
    gl.useProgram(shaderSceneProgram);  
    if (!inv)  {
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [0.0, .5, -10.0]); // translation of camera
        mat4.rotateX(mvMatrix, x); 
        mat4.rotateY(mvMatrix, y); 

    }
    setUniforms();   
    gl.bindBuffer(gl.ARRAY_BUFFER, staticPositionBuffer);
    gl.vertexAttribPointer(shaderSceneProgram.vertexPositionAttribute,3,gl.FLOAT,false,0,0);
    //gl.bindBuffer(gl.ARRAY_BUFFER, CubeVertexNormalBuffer);
    gl.vertexAttribPointer(shaderSceneProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
    
    if ( drawMode == 0 ) {
        // Normal mode
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, CindexBuffer);        
        gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
    }
    else {
        // Wire-frame mode
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, CindexBuffer);        
        gl.drawElements(gl.LINES, vertexCount, gl.UNSIGNED_SHORT, 0);
    }

}






