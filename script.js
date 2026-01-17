const SUPABASE_URL = "https://gjnekbzkminxdfqqvuyo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqbmVrYnprbWlueGRmcXF2dXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzU3MzAsImV4cCI6MjA4MjYxMTczMH0._5OT0vM6NAClqC0o1AbSdOkd_t63Pm8EQmcj_LnA1BY";
const VIDEO_PUBLICITARIO = "publicidad.mp4";
const SESSION_KEY = "ar_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userEmail = null;
let productCode = null;
let videos = [];
let currentVideoIndex = 0;
let isPlaying = false;

const authScreen = document.querySelector("#auth-screen");
const appScreen = document.querySelector("#app-screen");
const productCodeInput = document.querySelector("#product-code-input");
const authSubmitBtn = document.querySelector("#auth-submit-btn");
const authError = document.querySelector("#auth-error");
const logoutBtn = document.querySelector("#logout-btn");
const videoElement = document.querySelector("#ar-video");
const playPauseBtn = document.querySelector("#play-pause-btn");
const videoTitle = document.querySelector("#video-title");
const menuBtn = document.querySelector("#menu-btn");
const sidebar = document.querySelector("#sidebar");
const videoList = document.querySelector("#video-list");
const loading = document.querySelector("#loading");
const sceneEl = document.querySelector("a-scene");

let videoCircle = null;
let posterImg = null;
let ringInner = null;
let ringOuter = null;
let markerDetected = false;

function checkSession() {
  const session = localStorage.getItem(SESSION_KEY);
  if (session) {
    try {
      const sessionData = JSON.parse(session);
      const now = new Date().getTime();
      if (now - sessionData.timestamp < SESSION_DURATION) {
        userEmail = sessionData.email;
        productCode = sessionData.productCode;
        showApp();
        return true;
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
    }
  }
  return false;
}

function saveSession(email, code) {
  const sessionData = {
    email: email,
    productCode: code,
    timestamp: new Date().getTime(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

function showAuthError(message) {
  authError.textContent = message;
  authError.classList.add("show");
  setTimeout(() => {
    authError.classList.remove("show");
  }, 5000);
}

async function validateProductCode(code) {
  try {
    console.log("Validando código:", code.toUpperCase());
    const { data: productData, error: productError } = await supabaseClient
      .from("product_codes")
      .select("code, is_used")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    console.log("Resultado product_codes:", productData, productError);
    if (productError) {
      console.error("Error en product_codes:", productError);
      return {
        valid: false,
        message: "Error al validar código: " + productError.message,
      };
    }
    if (!productData) {
      return { valid: false, message: "Código de producto no válido" };
    }
    if (!productData.is_used) {
      return {
        valid: false,
        message: "Este código no ha sido registrado aún. Por favor regístrate primero en la aplicación web.",
      };
    }
    const { data: userData, error: userError } = await supabaseClient
      .from("user_registrations")
      .select("email, product_code")
      .eq("product_code", code.toUpperCase())
      .maybeSingle();
    console.log("Resultado user_registrations:", userData, userError);
    if (userError) {
      console.error("Error en user_registrations:", userError);
      return {
        valid: false,
        message: "Error al buscar usuario: " + userError.message,
      };
    }
    if (!userData) {
      return {
        valid: false,
        message: "No se encontró usuario asociado a este código",
      };
    }
    console.log("Usuario encontrado:", userData.email);
    return { valid: true, email: userData.email };
  } catch (error) {
    console.error("Error general:", error);
    return {
      valid: false,
      message: "Error al validar código: " + error.message,
    };
  }
}

async function handleAuth() {
  const code = productCodeInput.value.trim();
  if (code.length !== 6) {
    showAuthError("El código debe tener 6 caracteres");
    return;
  }
  authSubmitBtn.disabled = true;
  authSubmitBtn.innerHTML = '<span class="auth-loader"></span>Validando...';
  const validation = await validateProductCode(code);
  if (!validation.valid) {
    showAuthError(validation.message);
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "Acceder";
    return;
  }
  userEmail = validation.email;
  productCode = code.toUpperCase();
  saveSession(userEmail, productCode);
  showApp();
}

function showApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.add("active");
  initializeApp();
}

function logout() {
  if (confirm("¿Seguro que deseas cerrar sesión?")) {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  }
}

authSubmitBtn.addEventListener("click", handleAuth);
productCodeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleAuth();
});
productCodeInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase();
});
logoutBtn.addEventListener("click", logout);

function initializeApp() {
  sceneEl.addEventListener("loaded", () => {
    videoCircle = document.querySelector("#video-circle");
    posterImg = document.querySelector("#poster-img");
    ringInner = document.querySelector("#ring-inner");
    ringOuter = document.querySelector("#ring-outer");

    const target = document.querySelector("[mindar-image-target]");
    target.addEventListener("targetFound", () => {
      markerDetected = true;
      showPoster();
    });
    target.addEventListener("targetLost", () => {
      markerDetected = false;
    });
    const arSystem = sceneEl.systems["mindar-image-system"];
    arSystem.start();
  });
  loadVideos();
}

function showPoster() {
  if (posterImg && !isPlaying) {
    posterImg.setAttribute("animation", {
      property: "scale",
      from: "0 0 0",
      to: "1 1 1",
      dur: 500,
      easing: "easeInOutQuad",
    });
  }
}

function hidePoster() {
  if (posterImg) {
    posterImg.setAttribute("animation", {
      property: "scale",
      from: "1 1 1",
      to: "0 0 0",
      dur: 500,
      easing: "easeInOutQuad",
    });
  }
}

async function loadVideos() {
  try {
    const userFolder = `${userEmail}/`;
    console.log("Buscando videos en carpeta:", userFolder);

    let { data, error } = await supabaseClient.storage
      .from("videos")
      .list(userFolder, {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    console.log("Respuesta de Supabase (carpeta usuario):", { data, error });

    if ((!data || data.length === 0) && !error) {
      console.log("Intentando buscar en la raíz del bucket...");
      const rootResult = await supabaseClient.storage
        .from("videos")
        .list("", {
          limit: 100,
          sortBy: { column: "name", order: "asc" },
        });
      console.log("Respuesta de Supabase (raíz):", rootResult);
      data = rootResult.data;
      error = rootResult.error;
    }

    if (error) {
      console.error("Error al listar videos:", error);
      loading.innerHTML = `<div>Error: ${error.message}</div>`;
      videoTitle.textContent = "Error al cargar videos";
      return;
    }

    const videosUsuario = [];
    if (data && data.length > 0) {
      console.log(`Se encontraron ${data.length} archivos/carpetas`);

      const userFolderItem = data.find((item) => item.name === userEmail);

      if (userFolderItem && userFolderItem.id) {
        console.log("Encontrada carpeta del usuario, listando su contenido...");
        const { data: filesInFolder, error: folderError } =
          await supabaseClient.storage.from("videos").list(userEmail, {
            limit: 100,
            sortBy: { column: "name", order: "asc" },
          });

        console.log("Archivos dentro de la carpeta:", {
          filesInFolder,
          folderError,
        });

        if (!folderError && filesInFolder) {
          filesInFolder.forEach((file) => {
            console.log("Archivo encontrado:", file);
            if (file.name && file.name.match(/\.(mp4|webm|ogg)$/i)) {
              const videoUrl = supabaseClient.storage
                .from("videos")
                .getPublicUrl(`${userEmail}/${file.name}`).data.publicUrl;
              console.log("Video agregado:", file.name, videoUrl);
              videosUsuario.push({
                name: file.name.replace(/\.[^/.]+$/, ""),
                url: videoUrl,
                esPublicidad: false,
              });
            }
          });
        }
      } else {
        data.forEach((file) => {
          console.log("Archivo encontrado:", file);
          if (file.name && file.name.match(/\.(mp4|webm|ogg)$/i)) {
            const videoUrl = supabaseClient.storage
              .from("videos")
              .getPublicUrl(`${userFolder}${file.name}`).data.publicUrl;
            console.log("Video agregado:", file.name, videoUrl);
            videosUsuario.push({
              name: file.name.replace(/\.[^/.]+$/, ""),
              url: videoUrl,
              esPublicidad: false,
            });
          }
        });
      }
    } else {
      console.log("No se encontraron archivos en la carpeta");
    }

    const { data: publicidadData } = await supabaseClient.storage
      .from("videos")
      .list("", { limit: 1, search: VIDEO_PUBLICITARIO });
    if (publicidadData && publicidadData.length > 0) {
      videosUsuario.push({
        name: VIDEO_PUBLICITARIO.replace(/\.[^/.]+$/, ""),
        url: supabaseClient.storage
          .from("videos")
          .getPublicUrl(VIDEO_PUBLICITARIO).data.publicUrl,
        esPublicidad: true,
      });
    }
    videos = videosUsuario;
    if (videos.length > 0) {
      renderVideoList();
      loadVideo(0);
      loading.style.display = "none";
    } else {
      loading.innerHTML = `<div>No tienes videos aún</div>`;
      videoTitle.textContent = "No hay videos";
    }
  } catch (error) {
    videoTitle.textContent = "Error de conexión";
    loading.innerHTML = `<div>Error de conexión</div>`;
  }
}

function renderVideoList() {
  videoList.innerHTML = "";
  videos.forEach((video, index) => {
    const item = document.createElement("div");
    const isActive = index === currentVideoIndex;
    item.className = `video-item ${isActive ? "active" : ""} ${
      video.esPublicidad ? "publicidad" : ""
    }`;
    item.innerHTML = `<div class="video-item-title">${video.name}${
      video.esPublicidad ? '<span class="ad-badge">📢 Publicidad</span>' : ""
    }</div>`;
    item.addEventListener("click", () => {
      loadVideo(index);
      toggleSidebar();
    });
    videoList.appendChild(item);
  });
}

function loadVideo(index) {
  if (index < 0 || index >= videos.length) return;
  currentVideoIndex = index;
  const video = videos[index];
  videoElement.pause();
  videoElement.src = video.url;
  videoElement.load();
  videoTitle.textContent = video.esPublicidad
    ? `📢 ${video.name}`
    : video.name;
  isPlaying = false;
  playPauseBtn.textContent = "▶";
  if (posterImg) {
    posterImg.setAttribute("animation", {
      property: "scale",
      from: "0 0 0",
      to: "1 1 1",
      dur: 500,
      easing: "easeInOutQuad",
    });
  }
  renderVideoList();
}

function togglePlayPause() {
  if (isPlaying) {
    videoElement.pause();
    playPauseBtn.textContent = "▶";
    if (videoCircle)
      videoCircle.setAttribute("animation", {
        property: "scale",
        from: "1 1 1",
        to: "0 0 0",
        dur: 3000,
        easing: "easeInOutQuad",
      });
    if (ringInner)
      ringInner.setAttribute("animation", {
        property: "scale",
        from: "1 1 1",
        to: "0 0 0",
        dur: 3000,
        easing: "easeInOutQuad",
      });
    if (ringOuter)
      ringOuter.setAttribute("animation", {
        property: "scale",
        from: "1 1 1",
        to: "0 0 0",
        dur: 3000,
        easing: "easeInOutQuad",
      });

    setTimeout(() => {
      if (posterImg)
        posterImg.setAttribute("animation", {
          property: "scale",
          from: "0 0 0",
          to: "1 1 1",
          dur: 500,
          easing: "easeInOutQuad",
        });
    }, 3000);
    isPlaying = false;
  } else {
    hidePoster();
    setTimeout(() => {
      videoElement.play();
      playPauseBtn.textContent = "⏸";
      if (videoCircle)
        videoCircle.setAttribute("animation", {
          property: "scale",
          from: "0 0 0",
          to: "1 1 1",
          dur: 3000,
          easing: "easeInOutQuad",
        });
      if (ringInner)
        ringInner.setAttribute("animation", {
          property: "scale",
          from: "0 0 0",
          to: "1 1 1",
          dur: 3000,
          easing: "easeInOutQuad",
        });
      if (ringOuter)
        ringOuter.setAttribute("animation", {
          property: "scale",
          from: "0 0 0",
          to: "1 1 1",
          dur: 3000,
          easing: "easeInOutQuad",
        });

      isPlaying = true;
    }, 500);
  }
}

videoElement.addEventListener("ended", function () {
  if (videoCircle)
    videoCircle.setAttribute("animation", {
      property: "scale",
      from: "1 1 1",
      to: "0 0 0",
      dur: 3000,
      easing: "easeInOutQuad",
    });
  if (ringInner)
    ringInner.setAttribute("animation", {
      property: "scale",
      from: "1 1 1",
      to: "0 0 0",
      dur: 3000,
      easing: "easeInOutQuad",
    });
  if (ringOuter)
    ringOuter.setAttribute("animation", {
      property: "scale",
      from: "1 1 1",
      to: "0 0 0",
      dur: 3000,
      easing: "easeInOutQuad",
    });

  setTimeout(() => {
    if (posterImg)
      posterImg.setAttribute("animation", {
        property: "scale",
        from: "0 0 0",
        to: "1 1 1",
        dur: 500,
        easing: "easeInOutQuad",
      });
  }, 3000);
  isPlaying = false;
  playPauseBtn.textContent = "▶";
  videoElement.currentTime = 0;
});

function toggleSidebar() {
  sidebar.classList.toggle("open");
  menuBtn.classList.toggle("active");
}

playPauseBtn.addEventListener("click", togglePlayPause);
menuBtn.addEventListener("click", toggleSidebar);

const reloadBtn = document.querySelector("#reload-btn");
reloadBtn.addEventListener("click", () => {
  location.reload();
});

if (!checkSession()) {
  authScreen.classList.remove("hidden");
}