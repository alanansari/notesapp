import styles from "./Card.module.css";

function submit(setContent,text='hello'){
    setContent(text);
}

export default function Card({card_obj}){

    console.log(card_obj.text);

    return (
        <div className={styles.card}>
            <div className={styles.header}></div>
            <div className={styles.textarea}>{card_obj.text}</div>
        </div>
    );
}