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

/*#######################Initie une transaction côté serveur quand on appuie sur "=" #####################*/
            Send_Invoice();

        }
        else {
            screenValue += buttonText;
            screen.value = screenValue;
        }

    })
}



                                    /*LN code*/
/*##############################################################################"*/

var socket = io(); //Websocket

//Initie une transaction côté serveur
function Send_Invoice(){
    socket.emit("Send_Invoice","");
    var Invoice_Show = document.getElementById('LN_Invoice_Settled');
    Invoice_Show.style.display="none";
}

//Question 1: Affiche la facture LN
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

//Question 2: Affiche du résultat de la transaction
socket.on('Invoice_Settled', function(Invoice){
    console.log(" Invoice Settled :",Invoice);
    var Invoice_Show = document.getElementById('LN_Invoice_Settled');
    Invoice_Show.style.display="block";
    var Table = Invoice_Show.querySelector("table");
    var Tr = Table.querySelectorAll("tr")
    Tr[1].querySelectorAll("td")[1].innerText=Invoice.payment_preimage;
    Tr[2].querySelectorAll("td")[1].innerText=Invoice.payment_hash;
    Tr[3].querySelectorAll("td")[1].innerText=Invoice.payment_route.total_amt;
    Tr[4].querySelectorAll("td")[1].innerText=Invoice.payment_route.total_amt_msat;
    Tr[5].querySelectorAll("td")[1].innerText=Invoice.payment_route.total_fees;
    Tr[6].querySelectorAll("td")[1].innerText=Invoice.payment_route.total_fees_msat;
});


/*##############################################################################"*/




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
