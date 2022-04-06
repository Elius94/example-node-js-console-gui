#!/usr/bin/env node
 // For colors in the console
import chalk from 'chalk';
chalk.level = 1
import net from 'net';
import EventEmitter from 'events';

// I use readline to manage the keypress event
import readline from 'readline';
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true); // With this I only get the key value

const PORT = 9090
const HOST = '127.0.0.1'
let period = 100

let mode = 'random'

const periodList = [10, 100, 250, 500, 1000, 2000, 5000, 10000]
let selectedPeriod = period

const modeList = ["random", "linear"]
let selectedMode = mode

const clientManager = new EventEmitter()

let connectedClients = 0
    // The number of TCP message sent since start
let tcpCounter = 0

// Make A TCP Server that listens on port 9090
const server = net.createServer(socket => {
    connectedClients++;
    drawGui()
    clientManager.on('send', (data) => {
        socket.write(data + '\n')
        tcpCounter++;
    })
    socket.on("error", function(err) {
        lastErr = chalk.bgRed("Error: ") + ` ${err.stack}`;
    });
    socket.on('end', function() {
        lastErr = chalk.bgRed("Error: ") + ` Client disconnected!`;
        connectedClients--;
    });
}).listen(PORT, HOST);

let lastErr = ""

server.on('error', err => {
    lastErr = chalk.bgRed("Error: ") + chalk.white(` ${err.message}`);
})

let min = 9
let max = 12

let typedMaxValue = 0
let typedMinValue = 0

let values = [0, 0, 0, 0, 0, 0]

const frame = async() => {
    switch (mode) {
        case 'random':
            await updateWithRandomValues()
            break
        case 'linear':
            await updateWithLinearValues()
            break
        default:
            break
    }
    await sendValuesAsCsv()
}

let valueEmitter = null //setInterval(frame, period)
let direction = [1, 0, 1, 1, 0, 0] // 1 = Up
let step = 0.01

const updateWithRandomValues = async() => {
    values = values.map(value => Math.random() * (max - min) + min)
}

const updateWithLinearValues = async() => {
    // Generate linear values using direction and max/min values
    values = values.map((value, index) => {
        if (value >= max) {
            direction[index] = 0
        } else if (value <= min) {
            direction[index] = 1
        }
        return direction[index] === 1 ? value + step : value - step
    })
}

const sendValuesAsCsv = async() => {
    const csv = values.map(v => v.toFixed(4)).join(',')
    clientManager.emit('send', csv)
    drawGui()
}

let window = "HOME"

/**
 * @description Updates the console screen
 *
 */
const updateConsole = async() => {
    console.clear()
    console.log(chalk.yellow(`TCP server simulator app! Welcome...`))
    console.log(chalk.green(`TCP Server listening on ${HOST}:${PORT}`));
    console.log(chalk.green(`Connected clients: `) + chalk.white(`${connectedClients}\n`));
    console.log(chalk.magenta(`TCP Messages sent: `) + chalk.white(`${tcpCounter}`) + `\n`);

    // Print if simulator is running or not
    if (!valueEmitter) {
        console.log(chalk.red(`Simulator is not running! `) + chalk.white(`press 'space' to start`))
    } else {
        console.log(chalk.green(`Simulator is running! `) + chalk.white(`press 'space' to stop`))
    }
    // Print mode:
    console.log(chalk.cyan(`Mode:`) + chalk.white(` ${mode}`));
    // Print message frequency:
    console.log(chalk.cyan(`Message period:`) + chalk.white(` ${period} ms`));
    // Print Min and Max
    console.log(chalk.cyan(`Min:`) + chalk.white(` ${min}`));
    console.log(chalk.cyan(`Max:`) + chalk.white(` ${max}`));
    // Print current values:
    console.log(chalk.cyan(`Values:`) + chalk.white(` ${values.map(v => v.toFixed(4)).join('   ')}`));

    // Spacer
    console.log(`\n`);

    if (lastErr.length > 0) {
        console.error(lastErr)
        console.log('\n')
    }

    console.log(chalk.bgBlack(`Commands:`));
    console.log(`  ${chalk.bold('space')}   - ${chalk.italic('Start/stop simulator')}`);
    console.log(`  ${chalk.bold('m')}       - ${chalk.italic('Select simulation mode')}`);
    console.log(`  ${chalk.bold('s')}       - ${chalk.italic('Select message period')}`);
    console.log(`  ${chalk.bold('h')}       - ${chalk.italic('Set max value')}`);
    console.log(`  ${chalk.bold('l')}       - ${chalk.italic('Set min value')}`);
    console.log(`  ${chalk.bold('q')}       - ${chalk.italic('Quit')}`);
}

/**
 * @description Draws a window with an options selector (Select)
 *
 * @param {*} title - Title of the window
 * @param {*} options - Options of the window
 * @param {*} selected - Selected option
 */
const addOptionPopupLayer = (title, options, selected) => {
    const offset = 2
    const Terminal = process.stdout;
    const maxOptionsLength = options.reduce((max, option) => Math.max(max, option.toString().length), 0)
    const windowWidth = maxOptionsLength > title.length ? maxOptionsLength + (2 * offset) : title.length + (2 * offset)

    let header = "┌"
    for (let i = 0; i < windowWidth; i++) {
        header += "─"
    }
    header += "┐\n"
    header += `│${" ".repeat((windowWidth - title.length) / 2)}${title}${" ".repeat((windowWidth - title.length) / 2)}│\n`
    header += "├" + "─".repeat(windowWidth) + "┤\n"

    //││
    let footer = "└"
    for (let i = 0; i < windowWidth; i++) {
        footer += "─"
    }
    footer += "┘\n"

    let content = ""
    options.forEach((option, index) => {
        content += `│${option === selected ? "<" : " "} ${option}${option === selected ? " >" : "  "}${" ".repeat(windowWidth - option.toString().length - 4)}│\n`
    })

    const windowDesign = `${header}${content}${footer}`
    windowDesign.split('\n').forEach((line, index) => {
        Terminal.cursorTo(Math.round((Terminal.columns / 2) - (windowWidth / 2)), 4 + index)
        Terminal.write(line)
    })
}

/**
 * @description Draws a window with a text input (Input)
 *
 * @param {*} title - Title of the window
 * @param {*} value - Current value of the textbox
 */
const addInputPopupLayer = (title, value) => {
    const offset = 2
    const Terminal = process.stdout;
    const windowWidth = title.length > value.toString().length ? title.length + (2 * offset) : value.toString().length + (2 * offset)

    let header = "┌"
    for (let i = 0; i < windowWidth; i++) {
        header += "─"
    }
    header += "┐\n"
    header += `│${" ".repeat(windowWidth % 2 ? Math.round((windowWidth - title.length) / 2) : Math.round((windowWidth - title.length) / 2) - 1)}${title}${" ".repeat(Math.round((windowWidth - title.length) / 2))}│\n`
    header += "├" + "─".repeat(windowWidth) + "┤\n"

    //││
    let footer = "└"
    for (let i = 0; i < windowWidth; i++) {
        footer += "─"
    }
    footer += "┘\n"

    let content = ""
        // Draw an input field
    content += `│${"> "}${value}${" ".repeat(windowWidth - value.toString().length - 2)}│\n`

    const windowDesign = `${header}${content}${footer}`
    windowDesign.split('\n').forEach((line, index) => {
        Terminal.cursorTo(Math.round((Terminal.columns / 2) - (windowWidth / 2)), 4 + index)
        Terminal.write(line)
    })
    Terminal.cursorTo(Math.round((Terminal.columns / 2) - (windowWidth / 2)) + 2 + value.toString().length, 4 + 3)
}

// Add a command input listener to change mode
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        clearInterval(valueEmitter)
        server.close()
        process.exit()
    }
    // Controls of the main window
    switch (window) {
        case "HOME":
            {
                switch (key.name) {
                    case 'm':
                        window = "SET_MODE"
                        selectedMode = mode
                        break
                    case 'space':
                        {
                            if (!valueEmitter) {
                                if (connectedClients > 0) {
                                    valueEmitter = setInterval(frame, period)
                                    if (lastErr.includes("No clients connected!")) {
                                        lastErr = ""
                                    }
                                } else {
                                    lastErr = chalk.redBright("Error: ") + chalk.white(`No clients connected!`);
                                }
                            } else {
                                clearInterval(valueEmitter)
                                valueEmitter = null
                            }
                        }
                        break
                    case 's':
                        window = "SET_SPEED"
                        selectedPeriod = period
                        break
                    case 'h':
                        window = "SET_MAX"
                        typedMaxValue = max
                        break
                    case 'l':
                        window = "SET_MIN"
                        typedMinValue = min
                        break
                    case 'q':
                        clearInterval(valueEmitter)
                        server.close()
                        process.exit()
                    default:
                        break
                }
            }
            break
            // Controls of the SET_SPEED window
        case "SET_SPEED":
            {
                switch (key.name) {
                    case 'down':
                        selectedPeriod = periodList[periodList.indexOf(selectedPeriod) + 1]
                        break
                    case 'up':
                        selectedPeriod = periodList[periodList.indexOf(selectedPeriod) - 1]
                        break
                    case 'return':
                        {
                            period = selectedPeriod
                            if (valueEmitter) {
                                clearInterval(valueEmitter)
                                valueEmitter = setInterval(frame, period)
                            }
                            window = "HOME"
                        }
                        break
                    case 'escape':
                        window = "HOME"
                        break
                    case 'q':
                        clearInterval(valueEmitter)
                        server.close()
                        process.exit()
                    default:
                        break
                }
            }
            break
            // Controls of the SET_MODE window
        case "SET_MODE":
            {
                switch (key.name) {
                    case 'down':
                        selectedMode = modeList[modeList.indexOf(selectedMode) + 1]
                        break
                    case 'up':
                        selectedMode = modeList[modeList.indexOf(selectedMode) - 1]
                        break
                    case 'return':
                        {
                            mode = selectedMode
                            window = "HOME"
                        }
                        break
                    case 'escape':
                        window = "HOME"
                        break
                    case 'q':
                        clearInterval(valueEmitter)
                        server.close()
                        process.exit()
                    default:
                        break
                }
            }
            break
            // Controls of the SET_MAX window
        case "SET_MAX":
            {
                // In this case I want to allow only numbers to be typed and so I use the key.name to check if it is a number
                // It means that the typed key is a number or numpad number
                if (!Number.isNaN(Number(key.name))) {
                    if (typedMaxValue.toString().length < 20) {
                        let tmp = typedMaxValue.toString()
                        tmp += key.name
                        typedMaxValue = Number(tmp)
                    }
                    // To change the sign I check for the keys "+" and "-"
                } else if (key.sequence === '-') {
                    typedMaxValue = typedMaxValue * -1
                } else if (key.sequence === '+') {
                    typedMaxValue = Math.abs(typedMaxValue)
                } else {
                    switch (key.name) {
                        // Otherwise I check for the keys "return", "escape" and "backspace"
                        case 'backspace':
                            // If backspace is pressed I remove the last character from the typed value
                            if (typedMaxValue.toString().length > 0) {
                                typedMaxValue = Number(typedMaxValue.toString().slice(0, typedMaxValue.toString().length - 1))
                            }
                            break
                        case 'return':
                            // In case of "enter" I return the typed value to the main window
                            {
                                max = typedMaxValue
                                window = "HOME"
                            }
                            break
                        case 'escape':
                            window = "HOME"
                            break
                        case 'q':
                            clearInterval(valueEmitter)
                            server.close()
                            process.exit()
                        default:
                            break
                    }
                }
            }
            break
            // Controls of the SET_MIN window
        case "SET_MIN":
            {
                if (!Number.isNaN(Number(key.name))) {
                    if (typedMinValue.toString().length < 20) {
                        let tmp = typedMinValue.toString()
                        tmp += key.name
                        typedMinValue = Number(tmp)
                    }
                } else if (key.sequence === '-') {
                    typedMinValue = typedMinValue * -1
                } else if (key.sequence === '+') {
                    typedMinValue = Math.abs(typedMinValue)
                } else {
                    switch (key.name) {
                        case 'backspace':
                            if (typedMinValue.toString().length > 0) {
                                typedMinValue = Number(typedMinValue.toString().slice(0, typedMinValue.toString().length - 1))
                            }
                            break
                        case 'return':
                            {
                                min = typedMinValue
                                window = "HOME"
                            }
                            break
                        case 'escape':
                            window = "HOME"
                            break
                        case 'q':
                            clearInterval(valueEmitter)
                            server.close()
                            process.exit()
                        default:
                            break
                    }
                }
            }
            break
        default:
            break
    }
    drawGui()
})

const drawGui = () => {
    updateConsole()
    switch (window) {
        case "SET_SPEED":
            addOptionPopupLayer("Set message period", periodList, selectedPeriod)
            break
        case "SET_MODE":
            addOptionPopupLayer("Set simulation mode", modeList, selectedMode)
            break
        case "SET_MAX":
            addInputPopupLayer("Set max value", typedMaxValue)
            break
        case "SET_MIN":
            addInputPopupLayer("Set min value", typedMinValue)
            break
        default:
            break
    }
}

drawGui()