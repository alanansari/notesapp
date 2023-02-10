import styles from "./Card.module.css";

function deleteCard(props){
    console.log('delete card:',props.index);
    const notes = props.notes;
    notes.splice(props.index,1);
    // props.setNotes(notes);
    props.setNotes([...notes]);
    localStorage.setItem('saved_notes',JSON.stringify(notes));
}

export default function Card(props){

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <button className={styles.delete_btn} onClick={()=>
                    deleteCard(props)}>✖️
                </button>
            </div>
            <div className={styles.textarea}>{props.card_obj.text}</div>
        </div>
    );
}