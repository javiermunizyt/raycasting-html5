/*
Creado por Javier Muñiz @javianmuniz para
el canal de YouTube "Programar es increíble"
Suscríbete para más vídeos y tutoriales:
https://www.youtube.com/channel/UCS9KSwTM3FO2Ovv83W98GTg
Enlace los tutoriales paso a paso:
https://www.youtube.com/watch?v=8XnQq28TRZY&list=PLmD1VB8QabXxMe8khFFnePiJnmdJn8SuR
*/

var canvas;
var ctx;
var FPS = 50;

//DIMENSIONES EN PIXELS DEL CANVAS
var canvasAncho = 500;
var canvasAlto = 500;

var tamTile = 50;


//OBJETOS
var escenario;
var jugador;


var modo = 0;	//Raycasting = 0     Mapa = 1





//----------------------------------------------------------------------
//TECLADO
document.addEventListener('keydown',function(tecla){
	
	switch(tecla.keyCode){
		
		case 38:
			jugador.arriba();
		break;
		
		case 40:
			jugador.abajo();
		break;
		
		case 39:
			jugador.derecha();
		break;
		
		case 37:
			jugador.izquierda();
		break;
		
	}
	
	
});



document.addEventListener('keyup',function(tecla){
		
	switch(tecla.keyCode){	
		
		case 38:
			jugador.avanzaSuelta();
		break;
		
		case 40:
			jugador.avanzaSuelta();
		break;
		
		case 39:
			jugador.giraSuelta();
		break;
		
		case 37:
			jugador.giraSuelta();
		break;
		
		case 32:
			cambiaModo();
		break;
	}
});




function cambiaModo(){
	if(modo==0)
		modo = 1;
	else
		modo = 0;
}




//----------------------------------------------------------------------
//NIVEL 1

var nivel1 = [
	[1,1,2,1,1,1,2,2,1,1],
	[1,0,0,0,0,0,0,1,1,1],
	[1,0,0,0,0,0,0,1,1,1],
	[1,0,0,0,0,0,0,0,0,3],
	[1,0,1,2,1,0,0,0,0,1],
	[1,0,0,0,1,0,0,0,0,1],
	[1,0,0,0,1,0,0,3,3,1],
	[1,0,0,1,1,0,0,1,1,1],
	[1,0,0,0,0,0,0,0,0,1],
	[1,1,1,1,1,1,1,1,1,1]
];






//----------------------------------------------------------------------
//CLASE PARA EL ESCENARIO

class Level{
	
	constructor(can,con,arr){
		this.canvas = can;
		this.ctx = con;
		this.matriz = arr;
		
		//DIMENSIONES MATRIZ
		this.altoM  = this.matriz.length;
		this.anchoM = this.matriz[0].length;
		
		//DIMENSIONES REALES CANVAS
		this.altoC = this.canvas.height;
		this.anchoC = this.canvas.width;
		
		//TAMAÑO DE LOS TILES
		//this.altoT = parseInt(this.altoC / this.altoM);
		//this.anchoT = parseInt(this.anchoC / this.anchoM);
		this.altoT = tamTile;
		this.anchoT = tamTile;
		
	}
	
	
	//LE PASAMOS UNA CASILLA Y NOS DICE SI HAY COLISIÓN
	colision(x,y){
		var choca = false;
		if(this.matriz[y][x]!=0)
			choca = true;
		return choca;	
	}
	
	
	tile(x,y){
		var casillaX = parseInt(x/this.anchoT);		
		var casillaY = parseInt(y/this.altoT);	
		return(this.matriz[casillaY][casillaX]);
	}
	
	
	
	dibuja(){
		
		var color;
		
		
		for(var y=0; y<this.altoM; y++){
			for(var x=0; x<this.anchoM; x++){
				
				if(this.matriz[y][x]!=0)
					color = '#000000';
				else
					color = '#666666';
				
				this.ctx.fillStyle = color;
				this.ctx.fillRect(x * this.anchoT, y * this.altoT, this.anchoT, this.altoT);
			}
		}
		
	
	}

	
}


//-----------------------------------------------------------------------

//La usaremos para evitar que el ángulo crezca sin control
//una vez pasado de 2Pi, que vuelva a empezar
//usamos la función módulo

function normalizaAngulo(angulo){
	angulo = angulo % (2 * Math.PI);
	
	if(angulo < 0){
		angulo = (2 * Math.PI) + angulo;	//si es negativo damos toda la vuelta en el otro sentido
	}
	
	return angulo;
}


function convierteRadianes(angulo){
	angulo = angulo * (Math.PI / 180);
	return angulo;
}


function distanciaEntrePuntos(x1,y1,x2,y2){
	return Math.sqrt((x2 - x1) * (x2 - x1) + (y2-y1)*(y2-y1));
}


//============================================================================================

class Rayo{
	
	constructor(con,escenario,x,y,anguloJugador, incrementoAngulo, columna){
		
		this.ctx = con;
		this.escenario = escenario;
		
		this.x = x;
		this.y = y;
		
		this.incrementoAngulo = incrementoAngulo;
		this.anguloJugador = anguloJugador;
		this.angulo = anguloJugador + incrementoAngulo;
		
		
		this.wallHitX =0;
		this.wallHitY = 0;
		
		//LO SUSTITUIREMOS LUEGO POR VARIABLES LOCALES
		this.wallHitXHorizontal = 0;	//colisión con pared
		this.wallHitYHorizontal = 0;	//colisicón con pared
		
		this.wallHitXVertical = 0;	//colisión con pared
		this.wallHitYVertical = 0;	//colisicón con pared
		
		
		this.columna = columna;		//para saber la columna que hay que renderizar
		this.distancia = 0;	//para saber el tamaño de la pared al hacer el render
		
		
		this.pixelTextura = 0;	//pixel / columna de la textura
		this.idTextura = 0;		//valor de la matriz
		
		
		this.distanciaPlanoProyeccion = (canvasAncho/2) / Math.tan(FOV / 2);
		//============================================
		//PRUEBAS
		
		this.hCamara = 0; //movimiento vertical de la camara
		
		
	}
	
	
	//HAY QUE NORMALIZAR EL ÁNGULO PARA EVITAR QUE SALGA NEGATIVO
	setAngulo(angulo){
		this.anguloJugador = angulo;
		this.angulo = normalizaAngulo(angulo + this.incrementoAngulo);
	}
	
	
	cast(){
		
		this.xIntercept = 0;
		this.yIntercept = 0;
		
		this.xStep = 0;
		this.yStep = 0;
		
		
		//TENEMOS QUE SABER EN QUÉ DIRECCIÓN VA EL RAYO
		this.abajo = false;
		this.izquierda = false;
		
		
		if(this.angulo < Math.PI)
		  this.abajo = true;

		if(this.angulo > Math.PI/2 && this.angulo < 3 * Math.PI / 2)
		  this.izquierda = true;

		
		//=======================================================================
		// HORIZONTAL									
		var choqueHorizontal = false;	//detectamos si hay un muro
		

		//BUSCAMOS LA PRIMERA INTERSECCIÓN HORIZONTAL (X,Y)
		this.yIntercept = Math.floor(this.y / tamTile) * tamTile; 						//el Y es fácil, se redondea por abajo para conocer el siguiente
		
		//SI APUNTA HACIA ABAJO, INCREMENTAMOS 1 TILE
		if(this.abajo)
			this.yIntercept += tamTile;		//no se redondea por abajo, sino por arriba, así que sumamos 1 a la Y
		
		
		//SE LE SUMA EL CATETO ADYACENTE
		var adyacente = (this.yIntercept - this.y) / Math.tan(this.angulo);	//calculamos la x con la tangente
		this.xIntercept = this.x + adyacente;



		//------------------------------------------------------------------------
		//CALCULAMOS LA DISTANCIA DE CADA PASO
		this.yStep = tamTile;								//al colisionar con la Y, la distancia al próximo es la del tile
		this.xStep = this.yStep / Math.tan(this.angulo);	//calculamos el dato con la tangente
		
		
		//SI VAMOS HACIA ARRIBA O HACIA LA IZQUIERDA, EL PASO ES NEGATIVO
		
		if(!this.abajo)
			this.yStep = -this.yStep;
		

		//CONTROLAMOS EL INCREMENTO DE X, NO SEA QUE ESTÉ INVERTIDO
		if((this.izquierda && this.xStep > 0) || (!this.izquierda && this.xStep < 0)){
			this.xStep *= -1;
		}


	
		//COMO LAS INTERSECCIONES SON LÍNEAS, TENEMOS QUE AÑADIR UN PIXEL EXTRA O QUITARLO PARA QUE ENTRE
		//DENTRO DE LA CASILLA
		
		var siguienteXHorizontal = this.xIntercept;
		var siguienteYHorizontal = this.yIntercept;
		
		//SI APUNTA HACIA ARRIBA, FORZAMOS UN PIXEL EXTRA
		if(!this.abajo)
			siguienteYHorizontal--;

		
		//BUCLE PARA BUSCAR EL PUNTO DE COLISIÓN
		while(!choqueHorizontal){
			
			//OBTENEMOS LA CASILLA (REDONDEANDO POR ABAJO)
			var casillaX = parseInt(siguienteXHorizontal/tamTile);		
			var casillaY = parseInt(siguienteYHorizontal/tamTile);		
			
			if(this.escenario.colision(casillaX,casillaY)){
				choqueHorizontal = true;
				this.wallHitXHorizontal = siguienteXHorizontal;
				this.wallHitYHorizontal = siguienteYHorizontal;
			}
			
			else{
				siguienteXHorizontal += this.xStep;
				siguienteYHorizontal += this.yStep;
			}
		}
		
		//=======================================================================
		// VERTICAL									
		var choqueVertical = false;	//detectamos si hay un muro
		
		//BUSCAMOS LA PRIMERA INTERSECCIÓN VERTICAL (X,Y)
		this.xIntercept = Math.floor(this.x / tamTile) * tamTile; 		//el x es fácil, se redondea por abajo para conocer el siguiente
		
		//SI APUNTA HACIA LA DERECHA, INCREMENTAMOS 1 TILE
		if(!this.izquierda)
			this.xIntercept += tamTile;		//no se redondea por abajo, sino por arriba, así que sumamos 1 a la X
		
		//SE LE SUMA EL CATETO OPUESTO
		var opuesto = (this.xIntercept - this.x) * Math.tan(this.angulo); 
		this.yIntercept = this.y + opuesto;

		
		//------------------------------------------------------------------------
		//CALCULAMOS LA DISTANCIA DE CADA PASO
		this.xStep = tamTile;								//al colisionar con la X, la distancia al próximo es la del tile
		
		//SI VA A LA IZQUIERDA, INVERTIMOS
		if(this.izquierda)
			this.xStep *= -1;
		
		
		this.yStep = tamTile * Math.tan(this.angulo);	//calculamos el dato con la tangente
		
		//CONTROLAMOS EL INCREMENTO DE Y, NO SEA QUE ESTÉ INVERTIDO
		if((!this.abajo && this.yStep > 0) || (this.abajo && this.yStep < 0)){
			this.yStep *= -1;
		}
		
		//COMO LAS INTERSECCIONES SON LÍNEAS, TENEMOS QUE AÑADIR UN PIXEL EXTRA O QUITARLO PARA QUE ENTRE
		//DENTRO DE LA CASILLA
		
		var siguienteXVertical = this.xIntercept;
		var siguienteYVertical = this.yIntercept;
		
		
		//SI APUNTA HACIA IZQUIERDA, FORZAMOS UN PIXEL EXTRA
		if(this.izquierda)
			siguienteXVertical--;


		//BUCLE PARA BUSCAR EL PUNTO DE COLISIÓN
		while(!choqueVertical && (siguienteXVertical>=0 && siguienteYVertical>=0 && siguienteXVertical <canvasAncho && siguienteYVertical <canvasAlto)){
			
			//OBTENEMOS LA CASILLA (REDONDEANDO POR ABAJO)
			var casillaX = parseInt(siguienteXVertical/tamTile);		
			var casillaY = parseInt(siguienteYVertical/tamTile);		
			
			
			if(this.escenario.colision(casillaX,casillaY)){
				choqueVertical = true;
				this.wallHitXVertical = siguienteXVertical;
				this.wallHitYVertical = siguienteYVertical;
			}
			
			else{
				siguienteXVertical += this.xStep;
				siguienteYVertical += this.yStep;
			}
		}
		
		
		//============================================================
		//MIRAMOS CUÁL ES EL MÁS CORTO ¿VERTICAL U HORIZONTAL?
		
		
		//INICIALIZAMOS CON DISTANCIAS GRANDES PARA QUE SEPA CUAL LE TOCA
		var distanciaHorizontal = 9999;		
		var distanciaVertical = 9999;
		
		if(choqueHorizontal){
			distanciaHorizontal = distanciaEntrePuntos(this.x, this.y, this.wallHitXHorizontal, this.wallHitYHorizontal);
		}
		
		if(choqueVertical){
			distanciaVertical = distanciaEntrePuntos(this.x, this.y, this.wallHitXVertical, this.wallHitYVertical);
		}
		
		//COMPARAMOS LAS DISTANCIAS
		if(distanciaHorizontal < distanciaVertical){
			this.wallHitX = this.wallHitXHorizontal;
			this.wallHitY = this.wallHitYHorizontal;
			this.distancia = distanciaHorizontal;
			
			
			//PIXEL TEXTURA
			var casilla = parseInt(this.wallHitX / tamTile);
			this.pixelTextura = this.wallHitX - (casilla * tamTile);
			
			//ID TEXTURA
			this.idTextura = this.escenario.tile(this.wallHitX, this.wallHitY);
			
		}
		else{
			this.wallHitX = this.wallHitXVertical;
			this.wallHitY = this.wallHitYVertical;
			this.distancia = distanciaVertical;
			
			//PIXEL TEXTURA
			var casilla = parseInt(this.wallHitY / tamTile) * tamTile;
			this.pixelTextura = this.wallHitY - casilla;
			
			//ID TEXTURA
			this.idTextura = this.escenario.tile(this.wallHitX, this.wallHitY);
		}
		
		
		//CORREGIMOS EL EFECTO OJO DE PEZ
		this.distancia = this.distancia * (Math.cos(this.anguloJugador - this.angulo));
		
		
		//GUARDAMOS LA INFO EN EL ZBUFFER
		zBuffer[this.columna] = this.distancia;
		
		
	}
	
	
	
	
	

	
	color(){
		//https://www.w3schools.com/colors/colors_shades.asp
		
		//36 posibles matices
		var paso = 526344;		//Todos son múltiplos de #080808 = 526344(decimal);
		
		var bloque = parseInt(canvasAlto/36);
		var matiz = parseInt(this.distancia / bloque);
		var gris = matiz * paso;

		var colorHex = "#" + gris.toString(16);		//convertimos a hexadecimal (base 16)
		
		return(colorHex);
	}
	
	
	
	
	
	
	renderPared(){
		
		var altoTile = 500;		//Es la altura que tendrá el muro al renderizarlo

		var alturaMuro = (altoTile / this.distancia) * this.distanciaPlanoProyeccion;
		
		
		
		//CALCULAMOS DONDE EMPIEZA Y ACABA LA LÍNEA, CENTRÁNDOLA EN PANTALLA
		var y0 = parseInt(canvasAlto/2) - parseInt(alturaMuro/2);
		var y1 = y0 + alturaMuro;
		var x = this.columna;
		
		
		//VARIAMOS LA ALTURA DE LA CÁMARA
		
		var velocidad = 0.2;
		var amplitud = 20;
		
		var altura = 0;	//borrar cuando usemos el código de abajo
		
		
		//DIBUJAMOS CON TEXTURA
		var altoTextura = 64;
		
		var alturaTextura = y0 - y1;
		ctx.imageSmoothingEnabled = false;	//PIXELAMOS LA IMAGEN
		ctx.drawImage(tiles,this.pixelTextura,((this.idTextura -1 )*altoTextura),this.pixelTextura,63,x,y1 + altura,1,alturaTextura);	
		
	}
	
	
	
	
	dibuja(){

		//LANZAMOS EL RAYO
		this.cast();
		
		
		
		if(modo==0){
			this.renderPared();
		}
		
		
		if(modo == 1){
			//LÍNEA DIRECCIÓN
			var xDestino = this.wallHitX;    
			var yDestino = this.wallHitY;	
			
			this.ctx.beginPath();
			this.ctx.moveTo(this.x, this.y);
			this.ctx.lineTo(xDestino, yDestino);
			this.ctx.strokeStyle = "red";
			this.ctx.stroke();
		}
		
	}
	
	
}



//-----------------------------------------------------------------------

const FOV = 60;


class Player{
	
	constructor(con,escenario,x,y){
		
		this.ctx = con;
		this.escenario = escenario;
		
		this.x = x;
		this.y = y;
		
		this.avanza = 0;	//-1 atrás, 1 adelante
		this.gira = 0;		//-1 izquierda, 1 derecha
		
		this.anguloRotacion = 0;
		
		this.velGiro = convierteRadianes(3);		//3 grados en radianes
		this.velMovimiento = 3;
		
		
		//VISIÓN (RENDER)
		this.numRayos = 500;		//Cantidad de rayos que vamos a castear (los mismos que tenga el ancho del canvas)
		this.rayos = [];					//Array con todos los rayos
		
		
		//CALCULAMOS EL ANGULO DE LOS RAYOS
		var medioFOV 		 	 = FOV/2;		
		var incrementoAngulo	 = convierteRadianes(FOV / this.numRayos);
		var anguloInicial 	 	 = convierteRadianes(this.anguloRotacion - medioFOV);
		
		var anguloRayo = anguloInicial;
		
		//CREAMOS RAYOS
		for(let i=0; i<this.numRayos; i++){
			
			this.rayos[i] = new Rayo(this.ctx, this.escenario,this.x, this.y, this.anguloRotacion, anguloRayo,i);
			anguloRayo += incrementoAngulo;
		}
	
	}
	
	//LÓGICA DEL TECLADO
	arriba(){
		this.avanza = 1;
	}
	
	abajo(){
		this.avanza = -1;
	}
	
	derecha(){
		this.gira = 1;
	}
	
	izquierda(){
		this.gira = -1;
	}
	
	
	avanzaSuelta(){
		this.avanza = 0;
	}
	
	giraSuelta(){
		this.gira = 0;
	}
	
	
	
	colision(x,y){
		
		var choca = false;
		
		//AVERIGUAMOS LA CASILLA A LA QUE CORRESPONDEN NUESTRAS COORDENADAS
		var casillaX = parseInt(x/this.escenario.anchoT);
		var casillaY = parseInt(y/this.escenario.altoT);
		
		if(this.escenario.colision(casillaX, casillaY))
			choca = true;
		
		return choca;
	}
	
	
	
	//ACTUALIZAMOS LA POSICIÓN
	actualiza(){

		//AVANZAMOS
		
		var nuevaX = this.x +this.avanza * Math.cos(this.anguloRotacion) * this.velMovimiento;
		var nuevaY = this.y + this.avanza * Math.sin(this.anguloRotacion) * this.velMovimiento;
		
		if(!this.colision(nuevaX,nuevaY)){
			this.x = nuevaX;
			this.y = nuevaY;
		}
		
		//GIRAMOS
		this.anguloRotacion += this.gira * this.velGiro;
		this.anguloRotacion = normalizaAngulo(this.anguloRotacion);	//normalizamos
		
		
		//ACTUALIZAMOS LOS RAYOS
		for(let i=0; i<this.numRayos; i++){
			this.rayos[i].x = this.x;
			this.rayos[i].y = this.y;
			this.rayos[i].setAngulo(this.anguloRotacion);
		}
		
		
	}
	
	
	
	dibuja(){
		
		//ANTES DE DIBUJAR ACTUALIZAMOS
		this.actualiza();
		
		
		
		
		//RAYOS
		for(let i=0; i<this.numRayos; i++){
			this.rayos[i].dibuja();
		}
			

		if(modo == 1){
			//PUNTO
			this.ctx.fillStyle = '#FFFFFF';
			this.ctx.fillRect(this.x-3, this.y-3, 6,6);
			
			
			//LÍNEA DIRECCIÓN
			var xDestino = this.x + Math.cos(this.anguloRotacion) * 40;    //40 es la longitud de la línea
			var yDestino = this.y + Math.sin(this.anguloRotacion) * 40;	
			
			this.ctx.beginPath();
			this.ctx.moveTo(this.x, this.y);
			this.ctx.lineTo(xDestino, yDestino);
			this.ctx.strokeStyle = "#FFFFFF";
			this.ctx.stroke();
		}
		
		
	}
	
}


//------------------------------------------------------------------------------------
//MODIFICAMOS EL ESTILO CSS (por eso usamos canvas.style.width y no canvas.width)
function reescalaCanvas(){
	canvas.style.width = "800px";
	canvas.style.height = "800px";
}

//-------------------------------------------------------------------------------------
var ray;
var tiles;
var imgArmor;
var imgPlanta;
 
var sprites = [];	//array con los sprites
var zBuffer = [];	//array con la distancia a cada pared (con cada rayo)
 
//-------------------------------------------------------------------------------------
//SPRITES


const FOVRadianes = convierteRadianes(FOV);
const FOV_medio	  = convierteRadianes(FOV/2);


class Sprite{

	constructor(x,y,imagen){
		
		this.x 		 = x;
		this.y 		 = y;
		this.imagen  = imagen;
		
		this.distancia = 0;
		this.angulo  = 0;
		
		this.visible = false;
		
	}
	
	
	
	//CALCULAMOS EL ÁNGULO CON RESPECTO AL JUGADOR
	calculaAngulo(){


			var vectX = this.x - jugador.x;
			var vectY = this.y - jugador.y;
			

			var anguloJugadorObjeto = Math.atan2(vectY, vectX);
			var diferenciaAngulo = jugador.anguloRotacion - anguloJugadorObjeto;
			
			
			
			if (diferenciaAngulo < -3.14159)
				diferenciaAngulo += 2.0 * 3.14159;
			if (diferenciaAngulo > 3.14159)
				diferenciaAngulo -= 2.0 * 3.14159;
			
			
			diferenciaAngulo = Math.abs(diferenciaAngulo);
			

			if(diferenciaAngulo < FOV_medio)
				this.visible = true;
			else
				this.visible = false;


	}
	
	
	
	calculaDistancia(){
		this.distancia = distanciaEntrePuntos(jugador.x,jugador.y,this.x,this.y)
	}
	
	
	actualizaDatos(){
		this.calculaAngulo();
		this.calculaDistancia();
	}
	
	
	dibuja(){
		
		this.actualizaDatos();
		
		
		//punto mapa (Borrar)
		if(modo==1){
			ctx.fillStyle = '#FFFFFF';
			ctx.fillRect(this.x-3, this.y-3, 6,6);
		}
		
		
		if(this.visible == true){
			
			
			var altoTile = 500;		//Es la altura que tendrá el sprite al renderizarlo
			var distanciaPlanoProyeccion = (canvasAncho/2) / Math.tan(FOV / 2);
			var alturaSprite = (altoTile / this.distancia) * distanciaPlanoProyeccion;

			
			
			//CALCULAMOS DONDE EMPIEZA Y ACABA LA LÍNEA, CENTRÁNDOLA EN PANTALLA (EN VERTICAL)
			var y0 = parseInt(canvasAlto/2) - parseInt(alturaSprite/2);
			var y1 = y0 + alturaSprite;
			

			var altoTextura = 64;
			var anchoTextura = 64;
					
			var alturaTextura = y0 - y1;
			var anchuraTextura = alturaTextura;	//LOS SPRITES SON CUADRADOS
			
			

			//---------------------------------------------------------------------------
			// CALCULAMOS LA COORDENADA X DEL SPRITE
			
			
			
			var dx = this.x - jugador.x;
			var dy = this.y - jugador.y;
			
			var spriteAngle = Math.atan2(dy, dx) - jugador.anguloRotacion;
			
			var viewDist = 500;
			

			console.log(distanciaPlanoProyeccion);
			
			
			var x0 = Math.tan(spriteAngle) * viewDist;
			var x = (canvasAncho/2 + x0 - anchuraTextura/2);
			
			
			//-----------------------------------------------------------------------------
			ctx.imageSmoothingEnabled = false;	//PIXELAMOS LA IMAGEN
			
			
			//proporción de anchura de X (según nos acerquemos, se verán más anchas las líneas verticales)
			var anchuraColumna = alturaTextura/altoTextura;	
			

			//DIBUJAMOS EL SPRITE COLUMNA A COLUMNA PARA EVITAR QUE SE VEA TRAS UN MURO
			//LO HAGO CON DOS BUCLES, PARA ASEGURARME QUE DIBUJO LÍNEA A LÍNEA Y NO TIRAS DE LA IMAGEN 
			
			for(let i=0; i< anchoTextura; i++){
				for(let j=0; j<anchuraColumna; j++){
					
					var x1 = parseInt(x+((i-1)*anchuraColumna)+j);	
					
					//COMPARAMOS LA LÍNEA ACTUAL CON LA DISTANCIA DEL ZBUFFER PARA DECIDIR SI DIBUJAMOS
					if(zBuffer[x1] > this.distancia){
						ctx.drawImage(this.imagen,i,0,1,altoTextura-1,x1,y1,1,alturaTextura);
					}
					
					
				}
			}
			
			
	
	
		
		}
	
	}

}

//-------------------------------------------------------------------------------------




 
 //ALGORITMO DEL PINTOR, ORDENAMOS LOS SPRITES DE MÁS LEJANO AL JUGADOR A MÁS CERCANO
 
 function renderSprites(){
	 
	 
	//NOTA: HACER EL ALGORITMO DE ORDENACIÓN MANUAL
	 
	//ALGORITMO DE ORDENACIÓN SEGÚN DISTANCIA (ORDEN DESCENDENTE)
	//https://davidwalsh.name/array-sort

	sprites.sort(function(obj1, obj2) {
		// Ascending: obj1.distancia - obj2.distancia
		// Descending: obj2.distancia - obj1.distancia
		return obj2.distancia - obj1.distancia;
	});
	
	
	
	
	//DIBUJAMOS LOS SPRITES UNO POR UNO
	for(a=0; a<sprites.length; a++){
		sprites[a].dibuja();
	}
  
 }
 
 
 function inicializaSprites(){
 
  //CARGAMOS SPRITES
  imgArmor = new Image();
  imgArmor.src = "img/armor.png";
  
  imgPlanta = new Image();
  imgPlanta.src = "img/planta.png";
  
  //CREAMOS LOS OBJETOS PARA LAS IMÁGENES
  sprites[0] = new Sprite(300,120,imgArmor);
  sprites[1] = new Sprite(150,150,imgArmor);
  sprites[2] = new Sprite(320,300,imgPlanta);
  sprites[3] = new Sprite(300,380,imgPlanta);
  
 }
 
 
//============================================================================ 
function inicializa(){
  
  
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  
  
  //CARGAMOS TILES
  tiles = new Image();
  tiles.src= "img/walls.png";
  
 
  
  //MODIFICA EL TAMAÑO DEL CANVAS
  canvas.width = canvasAncho;
  canvas.height = canvasAlto;


  escenario = new Level(canvas,ctx,nivel1);
  jugador = new Player(ctx,escenario,100,100);
  
  
  
  //CARGAMOS LOS SPRITES DESPUÉS DEL ESCENARIO Y EL JUGADOR
  inicializaSprites();
	

  //EMPEZAMOS A EJECUTAR EL BUCLE PRINCIPAL
  setInterval(function(){principal();},1000/FPS);
  
  //AMPLIAMOS EL CANVAS CON CSS
  reescalaCanvas();
}



function borraCanvas(){
  canvas.width = canvas.width;
  canvas.height = canvas.height;
}


//PINTA COLORES BÁSICOS PARA SUELO Y TECHO
function sueloTecho(){
	ctx.fillStyle = '#666666';
	ctx.fillRect(0, 0, 500, 250);
	
	ctx.fillStyle = '#752300';
	ctx.fillRect(0, 250, 500, 500);
	
}




function principal(){
  borraCanvas();
  
  if(modo==1)
	escenario.dibuja();

  if(modo==0)
	  sueloTecho();
  
  jugador.dibuja();
  

  renderSprites();



}
