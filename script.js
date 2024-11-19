// Importamos las variables globales que vamos a usar en todo el script
let songVolume = 0.1; //volumen inicial de la canción
let howler; //para el objeto Howler (biblioteca de audio)
let analyser; //análisis de frecuencias del audio
let bufferLength; //longitud del buffer para el análisis
let dataArray; //almacena los datos de frecuencia
let animationFrame; //controlar la animación del ecualizador
let songs = []; //array para almacenar las canciones
let currentSongIndex = 0;
let equalizerColor = '#f9b5ff';

//obtenemos todos los elementos del DOM que vamos a necesitar, es mas eficiente que buscarlos cada vez que los necesitemos
const canvas = document.getElementById('equalizer');
const ctx = canvas.getContext('2d');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const songImage = document.getElementById('song-image');
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseIcon = playPauseBtn.querySelector('i');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');
const progressSlider = document.getElementById('progress-slider');
const currentTimeSpan = document.getElementById('current-time');
const totalTimeSpan = document.getElementById('total-time');
const playlistItems = document.getElementById('playlist-items');

//funcion asincrona para cargar las canciones desde el JSON
const loadSongs = async () => {
    try {
        const response = await fetch('./data.json'); //hace la solicitud al archivo json
        songs = await response.json(); //almacena los resultados
        renderPlaylist(); //renderizamos la playlist una vez cargadas las canciones
        loadSong(currentSongIndex); //primera canción, la variable almacena el indice de la canción actual
    } catch (error) {
        console.error('Error loading songs:', error);
    }
};

//funcion para crear la lista de reproduccion en el HTML
const renderPlaylist = () => {
    //map para crear los elementos de la lista y join para unirlos en un string
    playlistItems.innerHTML = songs.map((song, index) =>  //Recorre el array con los datos de las canciones para cada cancion genera elemnto <li>
        `<li data-index="${index}">
            <img src="${song.image}" alt="Portada de ${song.title}" width="50" height="50" onerror="this.src='/placeholder.svg?height=50&width=50'">
            ${song.title} - ${song.artist}
        </li>`
    ).join('');
};

//funcion para cargar una canción específica
const loadSong = (index) => {
    if (howler) {
        howler.unload(); //quita la cancion anterior si existe
    }
    const song = songs[index];
    //creamos un nuevo objeto Howl con la canción seleccionada
    howler = new Howl({
        src: [song.src],
        volume: songVolume,
        onplay: () => {  //Se dispara cuando comienza la reproducción
            playPauseIcon.className = 'fas fa-pause';
            animateEqualizer(); //iniciamos la animación del ecualizador
            updateTotalTime(); //muestra la duracion de la cancion
        },
        onpause: () => {
            playPauseIcon.className = 'fas fa-play'; //Cambio de icono
            cancelAnimationFrame(animationFrame); //detenemos la animacion
        },
        onend: () => {
            playPauseIcon.className = 'fas fa-play'; //cambio de icono
            cancelAnimationFrame(animationFrame); //para la animación del acualizador
        },
        onloaderror: (id, error) => console.error('Error loading song:', error)
    });

    //actualizamos la información de la cancion en la interfaz
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    songImage.src = song.image;
    songImage.alt = `Portada de ${song.title}`;
    songImage.onerror = () => {
        songImage.src = '/placeholder.svg?height=300&width=300'; 
    };

    //configuramos el analizador para el ecualizador
    analyser = Howler.ctx.createAnalyser();
    Howler.masterGain.connect(analyser); //Volumen global del howler
    analyser.connect(Howler.ctx.destination); //Normalmente la salida de altavoces
    analyser.fftSize = 2048; //tamaño de la transformada de Fourier
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    playPauseIcon.className = 'fas fa-play';
};

//funcion para animar el ecualizador
const animateEqualizer = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); //limpiamos el canvas
    analyser.getByteFrequencyData(dataArray); //Llena el array con valores numéricos que representan la amplitud de cada frecuencia (de 0 a 255)

    const barWidth = (canvas.width / bufferLength) * 10; //Ancho de cada barra, ancho total del canvas/numero de bins(bufferLength) y *10 para hacerlas mas grandes
    const barSpacing = 4; //Espacio de 4px entre las barras
    let x = 0; //Posicion inicial en el eje horizontal para dibujar la primera barra

    //dibujamos cada barra del ecualizador
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2; //la altura depende de la intensidad de la frecuencia y se divide x2 para ajustar las barras al tamaño del canvas
        ctx.fillStyle = equalizerColor;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + barSpacing;
    }

    //pide al navegador que ejecute la función animateEqualizer de nuevo antes de renderizar el próximo frame(bucle)
    animationFrame = requestAnimationFrame(animateEqualizer);
};

//funcion auxiliar para formatear el tiempo en minutos:segundos
const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

//actualiza el tiempo total mostrado para la cancion actual
const updateTotalTime = () => {
    totalTimeSpan.textContent = formatTime(howler.duration());
};

//actualiza el icono de volumen segun el nivel actual
const updateVolumeIcon = (volume) => {
    if (volume === 0) {
        volumeIcon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        volumeIcon.className = 'fas fa-volume-down';
    } else {
        volumeIcon.className = 'fas fa-volume-up';
    }
};

//event listeners para los controles de reproduccion
playPauseBtn.addEventListener('click', () => {
    if (howler.playing()) {
        howler.pause();
    } else {
        howler.play();
    }
});

prevBtn.addEventListener('click', () => {
    //canción anterior (con wrap-around)
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(currentSongIndex);
    howler.play();
});

nextBtn.addEventListener('click', () => {
    //vamos a la siguiente cancion (con wrap-around)
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadSong(currentSongIndex);
    howler.play();
});

//control de volumen
volumeSlider.addEventListener('input', (e) => {
    songVolume = parseFloat(e.target.value);
    howler.volume(songVolume);
    updateVolumeIcon(songVolume);
});

//control de progreso de la cancion
progressSlider.addEventListener('input', (e) => {
    const seekTime = parseFloat(e.target.value) * howler.duration();
    howler.seek(seekTime);
});

//manejo de clics en la lista de reproduccion
playlistItems.addEventListener('click', (e) => {
    const listItem = e.target.closest('li');
    if (listItem) {
        currentSongIndex = parseInt(listItem.dataset.index);
        loadSong(currentSongIndex);
        howler.play();
    }
});

//actualizamos el progreso de la cancion cada segundo
setInterval(() => {
    if (howler && howler.playing()) {
        const currentTime = howler.seek();
        const duration = howler.duration();
        const progress = currentTime / duration;
        progressSlider.value = progress;
        currentTimeSpan.textContent = formatTime(currentTime);
    }
}, 1000);

//iniciamos la aplicacion
volumeSlider.value = songVolume;
updateVolumeIcon(songVolume);
loadSongs();