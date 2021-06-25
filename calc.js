console.log("Javascript Calculator Made by Harsh Trivedi\nhttps://harsh98trivedi.github.io")

document.getElementById('answer').readOnly = true; //set this attribute in Html file
let screen = document.getElementById('answer');
buttons = document.querySelectorAll('button');
let screenValue = '';
for (item of buttons) {
    item.addEventListener('click', (e) => {
        // console.log(buttonText, "has been pressed");
        buttonText = e.target.innerText;
        if (buttonText == 'X') {
            buttonText = '*';
            screenValue += buttonText;
            screen.value = screenValue;
        }
        else if (buttonText == 'C') {
            screenValue = "";
            screen.value = screenValue;
        }
        else if (buttonText == '=') {
            screen.value = eval(screenValue);

        /*Create Lightning network Invoice*/
            Send_Invoice();

        }
        else {
            screenValue += buttonText;
            screen.value = screenValue;
        }

    })
}

var socket = io();

function Send_Invoice(){
    socket.emit("Send_Invoice","");
}

socket.on('Invoice_created', function(Invoice){
    console.log("Created Invoice:",Invoice);
    var Invoice_Show = document.getElementById('LN_Invoice_Created');
    Invoice_Show.style.display="block";
    var Table = Invoice_Show.querySelector("table");
    var Tr = Table.querySelectorAll("tr")
    Tr[1].querySelectorAll("td")[1].innerText=Invoice.r_hash;
    Tr[2].querySelectorAll("td")[1].innerText=Invoice.payment_request
    Tr[3].querySelectorAll("td")[1].innerText=Invoice.add_index
    Tr[4].querySelectorAll("td")[1].innerText=Invoice.payment_addr
});


document.addEventListener("keydown", function(event) {
    console.log(event.which);
    if(event.shiftKey==57){
        event.key = '(';
    }
    else if(event.shiftKey==48){
        event.key = ')';
    }
    else if(event.shiftKey==53){
        event.key = '%';
    }
    if(event.keyCode==88){
        screenValue += '*';
        screen.value = screenValue;
    }
    if(event.key<=9 || event.key=='+' || event.key=='-' || event.key=='*' || event.key=='.' || event.key=='/' || event.key=='%' || event.key=='(' || event.key==')'){
        screenValue += event.key;
        screen.value = screenValue;
    }
    if(event.keyCode == 13 || event.keyCode == 187)
    {
        screen.value = eval(screenValue);
    }
    else if(event.keyCode == 46){
        screenValue = "";
        screen.value = screenValue;
        console.clear();
    }
    else if(event.keyCode == 8){
        screenValue = screenValue.slice(0, -1);
        screen.value = screenValue;
    }
    else if(event.keyCode == 67){
        screenValue = "";
        screen.value = screenValue;
        console.clear();
    }
    else if(event.keyCode == 82){
        location.reload();
    }
  })

  window.onerror = function(){
      alert("PLEASE INPUT VALID EXPRESSION");
      screenValue = "";
      screen.value = screenValue;
      console.clear();
  }
