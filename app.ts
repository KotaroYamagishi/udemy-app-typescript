// drag & drop
// dragする対象
interface Draggable {
    dragStartHandler(event: DragEvent): void

    dragEndHandler(event: DragEvent): void
}

// dragしたものを格納する対象
interface DragTarget {
    // drag対象が有効なものかどうかをブラウザに伝える
    dragOverHandler(event: DragEvent): void

    // データの更新、画面の更新
    dropHandler(event: DragEvent): void

    // drag時の画面の挙動
    dragLeaveHandler(event: DragEvent): void
}

enum ProjectStatus {
    active, finished
}

class Project {
    constructor(
        public id: string,
        public title: string,
        public description: string,
        public manday: number,
        public status: ProjectStatus
    ) {
    }
}

type Listener<T> = (items: T[]) => void

class State<T> {
    // projectに変更があった時に自動的に呼び出される関数を格納する配列
    protected listeners: Listener<T>[] = []

    addListener(listenerFn: Listener<T>) {
        this.listeners.push(listenerFn)
    }
}

// project state management
class ProjectState extends State<Project> {
    // 関数の配列
    private projects: Project[] = []
    private static instance: ProjectState

    private constructor() {
        super()
    }

    // projectの状態管理を行うインスタンスを一つに統一するため
    static getInstance() {
        if (this.instance) {
            return this.instance
        } else {
            this.instance = new ProjectState()
            return this.instance
        }
    }

    addProject(title: string, description: string, manday: number) {
        const newProject = new Project(
            Math.random().toString(),
            title,
            description,
            manday,
            ProjectStatus.active
        )
        this.projects.push(newProject)
        this.updateListener()
    }

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find(prj => prj.id === projectId)
        console.log(newStatus)
        console.log(project)
        if (project && project.status !== newStatus) {
            project.status = newStatus
            this.updateListener()
        }
    }

    private updateListener() {
        for (const listenerFn of this.listeners) {
            // listener側で配列を変更できないようにする
            // 配列のコピーを作成する
            listenerFn(this.projects.slice())
        }
    }

}

const projectState = ProjectState.getInstance()

// validation
interface Validatable {
    value: string | number
    required?: boolean
    // 文字列の長さ
    minLength?: number
    maxLength?: number
    // 数値の最大値、最小値
    min?: number
    max?: number
}

function validate(validatableInput: Validatable) {
    let isValid = true
    if (validatableInput.required) {
        isValid = isValid && validatableInput.value.toString().length !== 0
    }
    if (validatableInput.minLength != null && typeof validatableInput.value == 'string') {
        isValid = isValid && validatableInput.value.length >= validatableInput.minLength
    }
    if (validatableInput.maxLength != null && typeof validatableInput.value == 'string') {
        isValid = isValid && validatableInput.value.length <= validatableInput.maxLength
    }
    if (validatableInput.min != null && typeof validatableInput.value == 'number') {
        isValid = isValid && validatableInput.value >= validatableInput.min
    }
    if (validatableInput.max != null && typeof validatableInput.value == 'number') {
        isValid = isValid && validatableInput.value <= validatableInput.max
    }
    return isValid;
}

// decorator
function AutoBind(
    _: any,
    _2: string | Symbol,
    desc: PropertyDescriptor
) {
    return {
        configurable: true,
        get() {
            return desc.value.bind(this)
        }
    }
}


// Components Class
abstract class Components<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement
    hostElement: T
    element: U

    constructor(
        templateId: string,
        hostId: string,
        insertAtStart: boolean,
        // 任意の引数は最後に定義する
        newElementId?: string,
    ) {
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement
        this.hostElement = document.getElementById(hostId)! as T
        const importedNode = document.importNode(this.templateElement.content, true)
        // importedNodeの最初の子要素を取得
        this.element = importedNode.firstElementChild as U
        if (newElementId) {
            this.element.id = newElementId
        }

        this.attach(insertAtStart)
    }

    abstract configure(): void

    abstract renderContent(): void

    private attach(insertAtBeginning: boolean) {
        this.hostElement.insertAdjacentElement(
            insertAtBeginning ? 'afterbegin' : 'beforeend',
            this.element
        )
    }
}

class ProjectItem extends Components<HTMLUListElement, HTMLLIElement> implements Draggable {
    private project: Project

    // getter関数はプロパティのようにアクセスする（vueのcomputedのような感じ）
    get manday() {
        if (this.project.manday < 20) {
            return this.project.manday.toString() + '人目'
        } else {
            return (this.project.manday / 20).toString() + '人月'
        }
    }

    constructor(hostId: string, project: Project) {
        super('single-project', hostId, false, project.id)
        this.project = project

        this.configure()
        this.renderContent()
    }

    @AutoBind
    dragStartHandler(event: DragEvent): void {
        // drop後に受け渡すデータを格納
        event.dataTransfer!.setData('text/plain', this.project.id)
        // move: 元の場所から削除されて新しいところに移動する
        // copy: 元の場所にもデータを保持しつつ、新しい場所にコピーする
        event.dataTransfer!.effectAllowed = 'move'
    }

    dragEndHandler(_: DragEvent): void {
        console.log('finished drag')
    }

    configure(): void {
        this.element.addEventListener('dragstart', this.dragStartHandler)
        this.element.addEventListener('dragend', this.dragEndHandler)
    }

    renderContent(): void {
        this.element.querySelector('h2')!.textContent = this.project.title
        this.element.querySelector('h3')!.textContent = this.manday
        this.element.querySelector('p')!.textContent = this.project.description
    }
}


class ProjectList extends Components<HTMLDivElement, HTMLElement> implements DragTarget {
    // プロジェクトの配列を保存する
    assignedProjects: Project[]

    constructor(private type: 'active' | 'finished') {
        super('project-list', 'app', false, `${type}-projects`)
        this.assignedProjects = []

        // ベースクラスで定義しない理由は、ベースクラスの中に定義するとsuper()で先呼び出してしまう恐れがあるから
        // 以下二つはメソッドの内容をコンストラクタの後に定義している可能性があるため、継承先で定義した方が安全
        this.configure()
        this.renderContent()
    }

    // dragができる場所かどうかを明確にする（背景色を変更する）
    @AutoBind
    dragOverHandler(event: DragEvent): void {
        if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
            // デフォルトの動作を実行させない
            // イベントのデフォルト操作を理解しておかないといけない
            event.preventDefault();
            const listEl = this.element.querySelector('ul')!
            listEl.classList.add('droppable')
        }
    }

    @AutoBind
    dropHandler(event: DragEvent): void {
        const prjId = event.dataTransfer!.getData('text/plain')
        projectState.moveProject(prjId, this.type === 'active' ? ProjectStatus.active : ProjectStatus.finished)
    }

    @AutoBind
    dragLeaveHandler(_: DragEvent): void {
        const listEl = this.element.querySelector('ul')!
        listEl.classList.remove('droppable')
    }

    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler)
        this.element.addEventListener('drop', this.dropHandler)
        this.element.addEventListener('dragleave', this.dragLeaveHandler)

        // ステータスによって格納するリストを変更する
        projectState.addListener((projects: Project[]) => {
            // statusをenumに沿って更新
            const relevantProjects = projects.filter(prj => {
                if (this.type === 'active') {
                    return prj.status === ProjectStatus.active;
                }
                return prj.status === ProjectStatus.finished;
            });
            this.assignedProjects = relevantProjects;
            this.renderProjects();
        })
    }

    renderContent() {
        this.element.querySelector('ul')!.id = `${this.type}-projects-list`
        this.element.querySelector('h2')!.textContent =
            this.type === 'active' ? '実行中の処理です' : '完了した処理です'
    }

    private renderProjects() {
        // ulListを取得
        const listEl = document.getElementById(`${this.type}-projects-list`) as HTMLUListElement
        listEl.innerHTML = ''
        // 複製したプロジェクトをlistItemに置き換え、ulListの子要素として格納
        for (const prjItem of this.assignedProjects) {
            new ProjectItem(listEl.id, prjItem)
        }
    }
}

class ProjectInput extends Components<HTMLDivElement, HTMLFormElement> {
    titleInputElement: HTMLInputElement
    descriptionInputElement: HTMLInputElement
    mandayInputElement: HTMLInputElement

    // コンストラクタでは要素の参照を取得
    constructor() {
        super('project-input', 'app', true, 'user-input')
        // 以下、formの中にある要素をquerySelectorを使用してDOMを取得
        // クラスの中で入力フォームを操作できるようになった
        this.titleInputElement = this.element.querySelector(
            '#title'
        ) as HTMLInputElement
        this.descriptionInputElement = this.element.querySelector(
            '#description'
        ) as HTMLInputElement
        this.mandayInputElement = this.element.querySelector(
            '#manday'
        ) as HTMLInputElement

        this.configure()
    }

    // イベントリスナーの設定
    configure() {
        this.element.addEventListener('submit', this.submitHandler)
    }

    renderContent() {
    }

    private gatherUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value
        const enteredDescription = this.descriptionInputElement.value
        const enteredManday = this.mandayInputElement.value

        //validation
        const titleValidatable: Validatable = {
            value: enteredTitle,
            required: true,
        }
        const descriptionValidatable: Validatable = {
            value: enteredDescription,
            required: true,
            minLength: 5
        }
        const mandayValidatable: Validatable = {
            value: enteredManday,
            required: true,
            min: 1,
            max: 1000
        }

        if (
            !validate(titleValidatable) ||
            !validate(descriptionValidatable) ||
            !validate(mandayValidatable)
        ) {
            alert('入力値が正しくありません')
            return;
        } else {
            return [enteredTitle, enteredDescription, +enteredManday]
        }
    }

    private clearInputs() {
        this.titleInputElement.value = ''
        this.descriptionInputElement.value = ''
        this.mandayInputElement.value = ''
    }

    @AutoBind
    private submitHandler(event: Event) {
        // このメソッドからhttpリクエストが送られないように
        event.preventDefault()
        const userInput = this.gatherUserInput()
        if (Array.isArray(userInput)) {
            const [title, desc, manday] = userInput
            projectState.addProject(title, desc, manday)
            this.clearInputs()
        }
    }

}


const prjInput = new ProjectInput()
const activeprjList = new ProjectList('active')
const finishedprjList = new ProjectList('finished')
