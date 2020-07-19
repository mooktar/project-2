// @ts-check

document.addEventListener('DOMContentLoaded', function () {

    // Init a websoket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Set local username and current channel
    localStorage.setItem('username', document.querySelector('#user').innerText.toLowerCase())
    if (!localStorage.getItem('current_channel')) { localStorage.setItem('current_channel', 'general'); }
    var current_channel = localStorage.getItem('current_channel')

    // Add active class on the current channel list
    document.querySelectorAll('.channel-item').forEach(item => {
        if ((item.dataset.channel === localStorage.getItem('current_channel')) && !(item.classList.contains('active'))) {
            item.classList.add('active');
        }
    });

    // When user connect for the first time
    socket.on('connect', () => {
        socket.emit('join', current_channel);
    });

    // Create new channel
    document.querySelector('#form-channel').addEventListener("submit", e => {
        const channel = document.querySelector('#channel').value;
        document.querySelector('#channel').value = '';
        socket.emit('create', channel);
        e.preventDefault();
        return false;
    });

    // List new created channel.
    socket.on('created', data => {
        if (data.success) {
            addChannel(data.channel)
        } else {
            alert(data.error);
        }
    });

    // When user select one channel, join it.
    document.querySelectorAll('.channel-item').forEach(item => {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            document.querySelectorAll('.channel-item').forEach(ch => { ch.classList.remove('active') });
            if (!(item.classList.contains('active'))) { item.classList.add('active') }
            socket.emit('join', item.dataset.channel);
            socket.emit('leave', current_channel);
            localStorage.setItem('current_channel', item.dataset.channel)
            return false;
        })
    });

    // When get joined, updated relatives messages
    socket.on('joined', data => {
        loadMessages(data);
        localStorage.setItem('current_channel', data.channel)
        document.querySelector('#menu').innerHTML = data.channel;
        // Delete a message
        document.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const message = btn.parentElement.parentElement.childNodes[1].innerText;
                socket.emit('delete', { "message": message, "channel": localStorage.getItem('current_channel') });
            })
        })
    });

    // When user left channel to an other
    socket.on('left', data => {
        loadMessages(data);
    });

    // Send new message
    document.querySelector('#form-message').addEventListener("submit", e => {
        e.preventDefault();
        const message = document.querySelector('#message').value;
        socket.emit('send', { "message": message, "channel": localStorage.getItem('current_channel') });
        document.querySelector('#message').value = '';
        return false;
    });

    // Show new sended message
    socket.on('sent', data => {
        newMessage(data);
    });

    // Update messages when message deleted
    socket.on('deleted', data => {
        loadMessages(data);
    })

    // Side menu for responsive mobile device
    document.querySelector('#menu').addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector('.channels').classList.toggle('channels-after');
    });

}, false);

// -------|     FUNCTIONS   |------- //

// Add new channel item in the channels list
function addChannel(channel) {
    const item = document.createElement('li');
    item.classList = 'list-group-item channel-item';
    item.setAttribute('data-channel', channel);
    item.innerHTML = channel;
    document.querySelector('#channels-list').append(item);
}

// Load messages from data
function loadMessages(data) {
    document.querySelector('#messages-list').innerHTML = '';
    for (var i = 0; i < data.messages.length; i++) {
        const message = data.messages[i];
        const msgItem = document.createElement('li');
        // create header message section
        const header = document.createElement('h5');
        header.innerHTML = `${message[0]} | <span>${message[1]}</span>`;
        // create message section for all messages
        if (message[0] === "statut") {
            msgItem.classList = "list-group-item message-user";
            msgItem.innerHTML = message[2];
        } else {
            if (message[0] === localStorage.getItem('username')) {
                // create delete button
                const deleteBtn = document.createElement('span');
                deleteBtn.classList = 'delete';
                deleteBtn.innerHTML = 'delete';
                msgItem.classList = 'list-group-item message-right';
                header.append(deleteBtn);
            } else {
                msgItem.classList = "list-group-item message-left";
            }
            // create message content section
            const contents = document.createElement('span')
            contents.innerHTML = message[2]
            msgItem.append(header);
            msgItem.append(contents);
        }
        document.querySelector('#messages-list').append(msgItem);
    }
}

// Post new message
function newMessage(data) {
    const msgItem = document.createElement('li');
    // create header message section
    const head = document.createElement('h5');
    head.innerHTML = `${data.user} | <span>${data.time}</span>`;
    if (data.user === document.querySelector('#user').innerText.toLowerCase()) {
        // create delete button
        const deleteBtn = document.createElement('span');
        deleteBtn.classList = 'delete';
        deleteBtn.innerHTML = 'delete';
        head.append(deleteBtn)
        msgItem.classList = 'list-group-item message-right';
    } else {
        msgItem.classList = 'list-group-item message-left';
    }
    const contents = document.createElement('span')
    contents.innerHTML = data.message
    msgItem.append(head);
    msgItem.append(contents);
    document.querySelector('#messages-list').append(msgItem);
}