import styles from './AddContentBar.module.css'
import {convertToText,convertOnPaste} from '../utils/editDiv'

function handleClick(props){
    let new_text = document.getElementById('textbox').innerText;
    new_text = convertToText(new_text);
    console.log(new_text);
    if(new_text==='') {
        document.getElementById('textbox').innerHTML = '';
        return;
    }
    const date = new Date();
    const formattedDate = date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    if(props.type==='note'){
        const newlist = [{text:new_text,timestamp:formattedDate},...props.notes];
        props.addNote(newlist);
        localStorage.setItem('saved_notes',JSON.stringify(newlist));
    }
    if(props.type==='task'){
        const newlist = [{text:new_text,done:false},...props.tasks];
        props.addTask(newlist);
        localStorage.setItem('saved_tasks',JSON.stringify(newlist));
    }
    document.getElementById('textbox').innerHTML = '';
}

export default function NewContentBar(props){
    return(
        <div className={styles.newnote_container}>
            <div id='textbox' 
                className={styles.textbox} 
                placeholder={props.msg}
                contentEditable='true'
                onPaste={(event)=>convertOnPaste(event)}></div>
            <button className={styles.create} onClick={()=>handleClick(props)}>▶</button>
        </div>
    );
}