import styles from "./Card.module.css";


export default function Card(props){

    function deleteCard(){
        console.log('delete card:',props.index);
        const notes = props.notes;
        notes.splice(props.index,1);
        props.setNotes(notes);
        console.log(notes);
        localStorage.setItem('saved_notes',JSON.stringify(notes));
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <button className={styles.delete_btn} onClick={()=>
                    deleteCard()}>✖️
                </button>
            </div>
            <div className={styles.textarea}>{props.card_obj.text}</div>
        </div>
    );
}