import styles from "./Card.module.css";
import {convertToMarkup} from '../utils/editDiv'
import {convertToText} from '../utils/editDiv'

function deleteCard(props){
    const notes = props.notes;
    notes.splice(props.index,1);
    props.setNotes([...notes]);
    localStorage.setItem('saved_notes',JSON.stringify(notes));
}

function makeEditable(props){
    const card = document.getElementsByClassName('card')[props.index];
    card.setAttribute('contentEditable','true');
    card.focus()
    window.getSelection().selectAllChildren(card)
    window.getSelection().collapseToEnd()
}

function saveEdited(props){
    let new_text = document.getElementsByClassName('card')[props.index].innerText;
    new_text = convertToText(new_text);
    const notes = [...props.notes];
    notes[props.index].text = new_text;
    console.log(notes);
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
                    deleteCard(props)}>✖️
                </button>
            </div>
            <div 
                onBlur={()=>saveEdited(props)}
                className={`${styles.textarea} card`}
                dangerouslySetInnerHTML={{__html: convertToMarkup(props.card_obj.text)}} />
            <div className={styles.footer}></div>
        </div>
    );
}