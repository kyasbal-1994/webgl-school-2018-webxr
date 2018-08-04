let xrDevice;
let xrCanvas;
let xrContext;
let xrSession;
let xrFrameRef;
let xrLayer;
let glCanvas;
let glContext;

document.addEventListener("DOMContentLoaded", () => {
  // デバイスが変わった時のイベント登録(最初も呼ばれる)
  navigator.xr.addEventListener("devicechange", async () => {
    xrDevice = await navigator.xr.requestDevice();
  });
  document.getElementById("enter-ar").addEventListener("click", doImmersive);
});
async function doImmersive() {
  // XR用に描画するためのcanvasを作る
  xrCanvas = document.createElement("canvas");
  xrCanvas.width = 512;
  xrCanvas.height = 512;
  // XR deviceに結び付けられるためのcontext
  xrContext = xrCanvas.getContext("xrpresent");
  // WebGLで描画するためのcanvas(これをXRデバイスに結びつける)
  glCanvas = document.createElement("canvas");
  glCanvas.width = 512;
  glCanvas.height = 512;
  // 通常通りwebglコンテキストを作る。preserveDrawingBufferがtrueでないとならない)
  glContext = glCanvas.getContext("webgl", { preserveDrawingBuffer: true });
  // デバイスからセッションを取得する
  xrSession = await xrDevice.requestSession({
    outputContext: xrContext,
    environmentIntegration: true // AR機能を使う
  });
  document.body.appendChild(xrCanvas);
  // WebGLコンテキストを介してデバイスに書き込むことを指定する
  await glContext.setCompatibleXRDevice(xrSession.device);
  // XRWebGLLayerを介して描画しなければならないのでこれらをSessionとglContextに結び付け
  xrLayer = new XRWebGLLayer(xrSession, glContext);
  xrSession.baseLayer = xrLayer;
  // poseの基準を示す値を作っておく
  xrFrameRef = await xrSession.requestFrameOfReference("eye-level");
  // window.requestAnimationFrameじゃないことに注意
  xrSession.requestAnimationFrame(onStartRequestAnumationFrame());
}
function onStartRequestAnumationFrame() {
  // 初期化処理全て
  /***************************************************
   *                    定数類
   ****************************************************/
  const vertices = [
    // 前面
    -1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0, // 背面
    -1.0,
    -1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0, // 上面
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    -1.0, // 底面
    -1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0, // 右側面
    1.0,
    -1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    -1.0,
    1.0, // 左側面
    -1.0,
    -1.0,
    -1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    -1.0
  ];
  const indicies = [
    0,
    1,
    2,
    0,
    2,
    3,
    4,
    5,
    6,
    4,
    6,
    7,
    8,
    9,
    10,
    8,
    10,
    11,
    12,
    13,
    14,
    12,
    14,
    15,
    16,
    17,
    18,
    16,
    18,
    19,
    20,
    21,
    22,
    20,
    22,
    23
  ]; // 前面 // 背面 // 上面 // 底面 // 右側面 // 左側面
  const vShaderSource = `
    attribute vec3 position;
    uniform mat4 mvp;
    void main(){
        gl_Position = mvp * vec4(position,1.);
    }
  `;
  const fShaderSource = `
  precision mediump float;
  void main(){
      gl_FragColor = vec4(1,0,0,1);
  }
  `;
  //行列をかける関数
  function matmul(out, a, b) {
    let a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    let a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    let a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    let a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];

    // Cache only the current line of the second matrix
    let b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }

  /***************************************************
   *                    初期化処理
   ****************************************************/
  const gl = glContext;
  // 頂点バッファを作る
  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  // インデックスバッファを作る
  const iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint8Array(indicies),
    gl.STATIC_DRAW
  );
  // 頂点シェーダを作る
  const vShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vShader, vShaderSource);
  const fShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fShader, fShaderSource);
  // シェーダをコンパイル
  gl.compileShader(vShader);
  if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vShader));
  }
  gl.compileShader(fShader);
  if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fShader));
  }
  // シェーダをリンク
  const program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);
  // シェーダーのパラメータのロケーションを取得
  const posAttribLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttribLoc);
  gl.vertexAttribPointer(posAttribLoc, 3, gl.FLOAT, false, 0, 0);
  gl.disable(gl.CULL_FACE);
  const mvpLoc = gl.getUniformLocation(program, "mvp");
  /***************************************************
   *                      ループ処理
   ****************************************************/
  function onXRAnimationFrame(time, frame) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, xrLayer.framebuffer); // XR用のframebufferに切り替える
    const pose = frame.getDevicePose(xrFrameRef);
    if (pose) {
      for (let view of frame.views) {
        const viewport = xrLayer.getViewport(view);
        gl.viewport(0, 0, viewport.width, viewport.height);
        const projMatrix = view.projectionMatrix;
        const camMatrix = pose.getViewMatrix(view);
        const modelMatrix = [
          0.3,
          0,
          0,
          0,
          0,
          0.3,
          0,
          0,
          0,
          0,
          0.3,
          0,
          0,
          0,
          0,
          1
        ];
        const resultMat = new Float32Array(16);
        matmul(resultMat, projMatrix, camMatrix);
        matmul(resultMat, resultMat, modelMatrix);
        gl.uniformMatrix4fv(mvpLoc, false, resultMat);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
      }
      document.getElementById("indicator").textContent = "detected";
    } else {
      document.getElementById("indicator").textContent = "missing";
    }
    xrSession.requestAnimationFrame(onXRAnimationFrame);
  }
  return onXRAnimationFrame;
}
