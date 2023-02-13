import styles from "./Card.module.css";
import {convertToMarkup} from '../utils/editDiv'
import {convertToText,convertOnPaste} from '../utils/editDiv'

function deleteCard(props){
    const notes = props.notes;
    notes.splice(props.index,1);
    props.setNotes([...notes]);
    localStorage.setItem('saved_notes',JSON.stringify(notes));
}

function makeEditable(props){
    const card = document.getElementsByClassName(`card_${props.index}`)[0];
    card.setAttribute('contentEditable','true');
    card.focus();
    window.getSelection().selectAllChildren(card);
    window.getSelection().collapseToEnd();
}

function saveEdited(props){
    let new_text = document.getElementsByClassName(`card_${props.index}`)[0].innerText;
    new_text = convertToText(new_text);
    const notes = [...props.notes];
    const date = new Date();
    notes[props.index].timestamp = date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
    notes[props.index].text = new_text;
    props.setNotes([...notes]);
    localStorage.setItem('saved_notes',JSON.stringify(notes));
}

export default function Card(props){

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <button className={styles.edit_btn} onClick={()=>makeEditable(props)}>
                ✏️
                </button>
                <button className={styles.delete_btn} onClick={()=>
                    deleteCard(props)}>❌
                </button>
            </div>
            <div
                onBlur={()=>{saveEdited(props)}}
                className={`${styles.textarea} card_${props.index}`}
                dangerouslySetInnerHTML={{__html: convertToMarkup(props.card_obj.text)}}
                onPaste={(event)=>convertOnPaste(event)} />
            <div className={styles.footer}>
                <p className={styles.timestamp}>{props.card_obj.timestamp||''}</p>
            </div>
        </div>
    );
}