const path_1 = require("path");
const fs_1 = require("fs");
const util_1 = require("util");
const canvas_1 = require("canvas");
const robot = require("robotjs");
const writeFileAsync = (0, util_1.promisify)(fs_1.writeFile);
const mkdirAsync = (0, util_1.promisify)(fs_1.mkdir);
const readline = require('readline');
const rl = readline.createInterface(
     process.stdin, process.stdout);

const defaults = {
    bgColor: '#fff',
    customHeight: 0,
    bubbleTail: { width: 0, height: 0 },
    debug: false,
    debugFilename: '',
    fontFamily: 'Helvetica',
    fontPath: '',
    fontSize: 60,
    fontWeight: 'normal',
    lineHeight: 28,
    margin: 10,
    maxWidth: 400,
    textAlign: 'left',
    textColor: '#000',
    verticalAlign: 'top',
};

	
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const createTextData = (text, config, canvas) => {
    const { bgColor, fontFamily, fontPath, fontSize, fontWeight, lineHeight, maxWidth, textAlign, textColor, } = config;
    if (fontPath) {
        (0, canvas_1.registerFont)(fontPath, { family: fontFamily });
    }
    const textCanvas = canvas || (0, canvas_1.createCanvas)(maxWidth, 100);
    const textContext = textCanvas.getContext('2d');
    let textX = 0;
    let textY = 0;
    if (['center'].includes(textAlign.toLowerCase())) {
        textX = maxWidth / 2;
    }
    if (['right', 'end'].includes(textAlign.toLowerCase())) {
        textX = maxWidth;
    }
    textContext.textAlign = textAlign;
    textContext.fillStyle = bgColor;
    textContext.fillRect(0, 0, textCanvas.width, textCanvas.height);
    textContext.fillStyle = textColor;
    textContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    textContext.textBaseline = 'top';
    const words = text.split(' ');
    let wordCount = words.length;
    let line = '';
    const addNewLines = [];
    for (let n = 0; n < wordCount; n += 1) {
        let word = words[n];
        if (/\n/.test(words[n])) {
            const parts = words[n].split('\n');
            word = parts.shift() || '';
            addNewLines.push(n + 1);
            words.splice(n + 1, 0, parts.join('\n'));
            wordCount += 1;
        }
        const testLine = `${line} ${word}`.replace(/^ +/, '').replace(/ +$/, '');
        const testLineWidth = textContext.measureText(testLine).width;
        if (addNewLines.indexOf(n) > -1 || (testLineWidth > maxWidth && n > 0)) {
            textContext.fillText(line, textX, textY);
            line = word;
            textY += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    textContext.fillText(line, textX, textY);
    const height = textY + Math.max(lineHeight, fontSize);
    return {
        textHeight: height,
        textData: textContext.getImageData(0, 0, maxWidth, height),
    };
};
const createImageCanvas = (content, conf) => {
    const { textHeight } = createTextData(content, {
        maxWidth: conf.maxWidth - conf.margin * 2,
        fontSize: conf.fontSize,
        lineHeight: conf.lineHeight,
        bgColor: conf.bgColor,
        textColor: conf.textColor,
        fontFamily: conf.fontFamily,
        fontPath: conf.fontPath,
        fontWeight: conf.fontWeight,
        textAlign: conf.textAlign,
    });
    const textHeightWithMargins = textHeight + conf.margin * 2;
    if (conf.customHeight && conf.customHeight < textHeightWithMargins) {
        console.warn('Text is longer than customHeight, clipping will occur.');
    }
    const height = conf.customHeight || textHeightWithMargins;
    const canvas = (0, canvas_1.createCanvas)(conf.maxWidth, height + conf.bubbleTail.height);
    const { textData } = createTextData(content, {
        maxWidth: conf.maxWidth - conf.margin * 2,
        fontSize: conf.fontSize,
        lineHeight: conf.lineHeight,
        bgColor: conf.bgColor,
        textColor: conf.textColor,
        fontFamily: conf.fontFamily,
        fontPath: conf.fontPath,
        fontWeight: conf.fontWeight,
        textAlign: conf.textAlign,
    }, canvas);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = conf.bgColor;
    ctx.fillRect(0, 0, canvas.width, height);
    if (conf.bubbleTail.width && conf.bubbleTail.height) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - conf.bubbleTail.width / 2, height);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.lineTo(canvas.width / 2 + conf.bubbleTail.width / 2, height);
        ctx.closePath();
        ctx.fillStyle = conf.bgColor;
        ctx.fill();
    }
    const textX = conf.margin;
    let textY = conf.margin;
    if (conf.customHeight && conf.verticalAlign === 'center') {
        textY =
            (conf.customHeight - textData.height) / 2 +
                Math.max(0, (conf.lineHeight - conf.fontSize) / 2);
    }


	textData.getIndexByPoint = function(x,y)
	{
		return (4 * x) + (this.width * 4 * y);
	}

	textData.setColor = function(point,color)
	{
		let index = this.getIndexByPoint(point[0],point[1]);
		this.data[index + 0]  = color[0];
		this.data[index + 1]  = color[1];
		this.data[index + 2]  = color[2];
	}


	textData.getColor = function(point)
	{
		let index = this.getIndexByPoint(point[0],point[1]);
		return [this.data[index + 0],this.data[index + 1],this.data[index + 2]];
	}

	textData.threshold = function(t)
	{
		for(var i = 0; i < this.width; ++i)
		{
			for(var j = 0; j < this.height; ++j)
			{
				let color = this.getColor([i,j]);
				if(color[0] < t || color[1] < t || color[2] < t)
					this.setColor([i,j],[0,0,0]);
				else
					this.setColor([i,j],[255,255,255]);
			}
		}
	}


	textData.isBlack = function(point)
	{
		let color = this.getColor(point);
		return color[0] == 0 && color[1] == 0 && color[2] == 0;
	}

	textData.threshold(150);
	
	/*
	textData.build = function()
	{
		that = this;
		function dfs(point,color)
		{
			if(!that.isBlack(point))
				return;

			that.setColor(point,color);

			let dir_x = [0,0,1,-1,1,-1,-1,-1];
			let dir_y = [1,-1,0,0,1,-1,1,1];
			for(let i = 0; i < 8; ++i)
			{
				let newPoint = [point[0] + dir_x[i], point[1] + dir_y[i]];
				if(newPoint[0] >= 0 && newPoint[0] < that.width && newPoint[1] >= 0 && newPoint[1] < that.height)
				{
					dfs(newPoint,colorList[count % 5]);
				}
			}
			++count;
		}

		let colorList = [[255,0,0],[255,0,255],[0,255,255],[0,255,0],[255,255,0]];
		let count = 0;
		for(let i = 0; i < this.width; ++i)
		{
			for(let j = 0; j < this.height; ++j)
			{
				if(this.isBlack([i,j]))
				{
					dfs([i,j],colorList[count % 5]);
					++count;
				}
			}
		}
	}
*/

//	textData.build();

    ctx.putImageData(textData, textX, textY);
    return {canvas: canvas,textData:textData};
};

const generate = async (content, config) => {
    const conf = { ...defaults, ...config };
    const res = createImageCanvas(content, conf);
	const canvas = res.canvas;
	const textData = res.textData;
    const dataUrl = canvas.toDataURL();



    if (conf.debug) {
        const fileName = conf.debugFilename ||
            `${new Date().toISOString().replace(/[\W.]/g, '')}.png`;
        await mkdirAsync((0, path_1.resolve)((0, path_1.dirname)(fileName)), { recursive: true });
        await writeFileAsync(fileName, canvas.toBuffer());
    }


	const mouse = robot.getMousePos();
	await sleep(3000);

	/*
	that = textData;
	function dfs(point,color)
	{
		if(!that.isBlack(point))
			return;

		that.setColor(point,color);

		let dir_x = [0,0,1,-1,1,-1,-1,-1];
		let dir_y = [1,-1,0,0,1,-1,1,1];
		for(let i = 0; i < 8; ++i)
		{
			let newPoint = [point[0] + dir_x[i], point[1] + dir_y[i]];
			if(newPoint[0] >= 0 && newPoint[0] < that.width && newPoint[1] >= 0 && newPoint[1] < that.height)
			{
				dfs(newPoint,colorList[count % 5]);
			}
		}
		++count;
		let colorList = [[255,0,0],[255,0,255],[0,255,255],[0,255,0],[255,255,0]];
		let count = 0;
	}*/

	for(let i = 0; i < textData.width; ++i)
	{
		for(let j = 0; j < textData.height; ++j)
		{
			if(textData.isBlack([i,j]))
			{
				let newX = mouse.x+(i * 2);
				let newY = mouse.y+(j * 2);

				await sleep(30);
				robot.moveMouse(newX,newY);
				await sleep(30);
				robot.mouseClick();
				const pos = robot.getMousePos();
				if(pos.x != newX && pos.y != newY)
				{
					console.log('The mouse has moved and the process is interrupted.');
					return dataUrl;
				}
			}
		}
	}
	console.log('Enjoy!');
    return dataUrl;
};





async function run()
{	
	console.log('Please be prepared to put the mouse in the upper left corner of the place where you need to sign, and do not move the mouse during the signing process, otherwise the program will stop.');

	rl.question('Text to sign: ', async (text) => {
		console.log('starting signing process in 3s...');
		const dataUri = await generate(text, {fontFamily: 'Kaiti',fontSize:60});
	});
}

run();