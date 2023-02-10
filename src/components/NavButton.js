import styles from './NavButton.module.css'

export default function NavButton(props) {

    function handleClick(){
        window.location.pathname = props.link;
    }

    const active = window.location.pathname!=='/'&&(props.link.match(window.location.pathname))?styles.active:'';

    return(
        <div className={styles.btn_box}>
            <button className={`${styles.btn} ${active}`} onClick={()=>{handleClick()}}>{props.type}</button>
        </div>
    );
}
