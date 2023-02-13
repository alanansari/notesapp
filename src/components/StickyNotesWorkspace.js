import styles from './StickyNotesWorkspace.module.css'
import Card from './Card';
import { useState } from 'react';
import {convertToText,convertOnPaste} from '../utils/editDiv'

function handleClick(props){
    let new_text = document.getElementById('textbox').innerText;
    new_text = convertToText(new_text);
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
    const newlist = [{text:new_text,timestamp:formattedDate},...props.notes];
    props.addNote(newlist);
    localStorage.setItem('saved_notes',JSON.stringify(newlist));
    document.getElementById('textbox').innerHTML = '';
}

function NewNoteBar(props){
    return(
        <div className={styles.newnote_container}>
            <div id='textbox' 
                className={styles.textbox} 
                placeholder='Make a note...'  
                contentEditable='true'
                onPaste={(event)=>convertOnPaste(event)}></div>
            <button className={styles.create} onClick={()=>handleClick(props)}>▶</button>
        </div>
    );
}

export default function Workspace(){

    const [notes,setNotes] = useState(JSON.parse(localStorage.getItem('saved_notes')) || []);

    return(
        <div className={styles.container}>
            <div className={styles.topchild}>
                <NewNoteBar notes={notes} addNote={setNotes} />
            </div>
            <div className={styles.bottomchild}>
                <div className={styles.row}>
                    {notes.map((note,i) => {
                            if(i%3===0)
                            return <Card key={crypto.randomUUID()} index={i} notes={notes} card_obj={note} setNotes={setNotes}/>
                            else
                            return <></>;
                        })}
                </div>
                <div className={styles.row}>
                    {notes.map((note,i) => {
                            if(i%3===1)
                            return <Card key={crypto.randomUUID()} index={i} notes={notes} card_obj={note} setNotes={setNotes}/>
                            else
                            return <></>;
                        })}
                </div>
                <div className={styles.row}>
                    {notes.map((note,i) => {
                            if(i%3===2)
                            return <Card key={crypto.randomUUID()} index={i} notes={notes} card_obj={note} setNotes={setNotes}/>
                            else
                            return <></>;
                        })}
                </div>
            </div>
        </div>
    );
}