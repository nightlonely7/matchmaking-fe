'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var matchmakingPage = document.querySelector('#matchmaking-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');
var matchmakingForm = document.querySelector('#matchmakingForm');
var matchmakingNotify = document.querySelector('#matchmakingNotify');
var connectedCount = document.querySelector('#connected-count');
var joinLeaderboard = document.querySelector('#join-leaderboard');
var stompClient = null;
var username = null;
let src = './res/mixkit-home-standard-ding-dong-109.wav';
let audio = new Audio(src);

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

function connect(event) {
    username = document.querySelector('#name').value.trim();
    console.log("connecting")
    if (username) {
        usernamePage.classList.add('hidden');
        // chatPage.classList.remove('hidden');
        matchmakingPage.classList.remove('hidden');

//        var socket = new SockJS('ws://localhost:8080/ws');
        stompClient = Stomp.client('ws://ec2-13-250-34-210.ap-southeast-1.compute.amazonaws.com:8080/ws');
        // stompClient = Stomp.client('ws://localhost:8080/ws');

        stompClient.connect({username}, onConnected, onError);
        console.log("connected")
    }
    event.preventDefault();
}


function onConnected() {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.subscribe('/topic/matchmaking', onMatchmakingReceived);
    stompClient.subscribe('/topic/count', onCountReceived);
    stompClient.subscribe('/topic/joinLeaderboard', onJoinLeaderboardReceived);

    // Tell your username to the server
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    )

    connectingElement.classList.add('hidden');
}


function onError(error) {
    console.log(error);
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}


function sendMessage(event) {
    var messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
    event.preventDefault();
}

function registerMatchmaking(event) {
    if (stompClient) {
        var matchmakingMessage = {
            sender: username
        };
        stompClient.send("/app/matchmaking.register", {}, JSON.stringify(matchmakingMessage));
    }
    matchmakingNotify.innerHTML = "Đang tìm trận..."
    matchmakingForm.hidden = true;
    event.preventDefault();
}

function onJoinLeaderboardReceived(payload) {
    const message = JSON.parse(payload.body);
    console.log(message);
    if (message) {
        // joinLeaderboard.innerHTML = "Xếp hạng tham gia: ";
        const messageElement = document.createElement('li');
        const textElement = document.createElement('span');
        for (let i = 0; i < message.length; i++) {
            // const userScoreLi = document.createElement('li');
            // userScoreLi.innerHTML = `${message[i].username} : ${message[i].score}`;
            // joinLeaderboard.appendChild(userScoreLi);

            const messageText = document.createTextNode(`${message[i].username} đã tham gia : ${message[i].score} trận`);
            textElement.appendChild(messageText);
            const newline = document.createTextNode('\n');
            textElement.appendChild(newline);
        }
        messageElement.appendChild(textElement);
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    }
}

function onMatchmakingReceived(payload) {
    var message = JSON.parse(payload.body);
    const selectedSong = message.selectedSong;
    const matchedUserList = message.matchedUserList;
    if (matchedUserList.some(e => e.username === username)) {
        audio.play();
        setTimeout(() => matchmakingForm.hidden = false, 60000 * 3);
        var hostUser = matchedUserList.find(e => e.host === true);
        matchmakingNotify.innerHTML = "Đã tìm được phòng, các thành viên tham gia bao gồm: "
        matchedUserList.forEach(e => {
            var user = document.createElement('li');
            user.innerHTML = (e.username).concat((e.host ? " <span style='color: red;'> (CHỦ PHÒNG)</span>" : ''));
            matchmakingNotify.appendChild(user);
        });

        var hostInstruction = document.createElement('span');
        hostInstruction.innerHTML = "Bạn " + " <span style='color: red;'>" + hostUser.username + "</span>" + " hãy tạo phòng để mọi người tham gia nhé!";
        matchmakingNotify.append(hostInstruction);

        var songInstruction = document.createElement('span');
        songInstruction.innerHTML = `Bài hát được chọn: ${selectedSong.composer} - ${selectedSong.name}, bpm: ${selectedSong.bpm}, level: ${selectedSong.level}, chế độ: ${selectedSong.mode}`;
        matchmakingNotify.append(songInstruction);
    }
}

function onCountReceived(payload) {
    console.log("count received");
    var message = JSON.parse(payload.body);
    if (message.connected) {
        connectedCount.innerHTML = message.connected;
    }
}

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    var messageElement = document.createElement('li');

    if (message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' đã tham gia!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' đã rời khỏi!';
    } else {
        messageElement.classList.add('chat-message');

        var avatarElement = document.createElement('i');
        var avatarText = document.createTextNode(message.sender[0]);
        avatarElement.appendChild(avatarText);
        avatarElement.style['background-color'] = getAvatarColor(message.sender);

        messageElement.appendChild(avatarElement);

        var usernameElement = document.createElement('span');
        var usernameText = document.createTextNode(message.sender);
        usernameElement.appendChild(usernameText);
        messageElement.appendChild(usernameElement);
    }

    var textElement = document.createElement('p');
    var messageText = document.createTextNode(message.content);
    textElement.appendChild(messageText);

    messageElement.appendChild(textElement);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}


function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

usernameForm.addEventListener('submit', connect, true)
messageForm.addEventListener('submit', sendMessage, true)
matchmakingForm.addEventListener('submit', registerMatchmaking, true)