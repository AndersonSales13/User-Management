class UserController {
	constructor(formIdCreate, formIdUpdate, tableId){
		this.formEl = document.getElementById(formIdCreate);
		this.formUpdateEl = document.getElementById(formIdUpdate);
		this.tableEl = document.getElementById(tableId);

		this.btnSubmit = this.formEl.querySelector("[type=submit]");

		this.selectAll();
		
		this.onSubmit();
		this.onEdit();

	}

	onEdit(){
		document.querySelector("#box-user-update .btn-cancel").addEventListener("click", (e)=>{
			
			this.showPanelCreate();
		});

		this.formUpdateEl.addEventListener("submit", (e)=>{
			e.preventDefault();

			this.btnSubmit.disabled = true;

			let values = this.getValues(this.formUpdateEl);

			let indexRow = this.formUpdateEl.dataset.trIndex;

			let tr = this.tableEl.rows[indexRow];

			let userOld = JSON.parse(tr.dataset.user);

			let result = Object.assign({}, userOld, values);

			this.getPhoto(this.formUpdateEl).then(
				(content)=>{

					if (!values.photo) {
						result._photo = userOld._photo;
					} else {
						result._photo = content;
					}

					let user = new User();
					
					user.loadFromJSON(result);

					user.save();

					this.getTr(user, tr)

					this.updateCount();
					
					this.formUpdateEl.reset();

					this.btnSubmit.disabled = false;

					this.showPanelCreate();

				},
				(e)=>{
					console.error(e);
				}
			);
		});
	}

	onSubmit(){

		this.formEl.addEventListener("submit", (e)=>{
			e.preventDefault();

			this.btnSubmit.disabled = true;

			let values = this.getValues(this.formEl);

			if(!values) return false;

			this.getPhoto(this.formEl).then(
				(content)=>{
					
					values.photo = content;

					values.save();

					this.addLine(values);
					
					this.btnSubmit.disabled = false;

					this.formEl.reset();

					[...this.formEl.elements].forEach((element, index)=>{
						if(["name", "email", "password"].indexOf(element.name) > -1) {
							element.parentElement.classList.remove("has-error");
						}
					});

				},
				(e)=>{
					console.error(e);
				}
			);

		});
	}

	getPhoto(formEl){
		return new Promise ((resolve, reject)=>{
			
			let fileReader = new FileReader();

			let elements = [...formEl.elements].filter(item=>{				
				if(item.name === "photo") {
					return item;
				}
			});

			let file = elements[0].files[0];

			fileReader.onload = ()=>{
				resolve(fileReader.result);
			};

			fileReader.onerror = (e) => {
				reject(e);
			}

			if(file){
				fileReader.readAsDataURL(file);
			} else {
				resolve("dist/img/boxed-bg.jpg");
			}

		}); 
	}

	getValues(formEl){
		let user = {};

		let isValid = true;

		[...formEl.elements].forEach((element, index)=>{

			if(["name", "email", "password"].indexOf(element.name) > -1 && !element.value){
				element.parentElement.classList.add("has-error");

				isValid = false;
			}

			if (element.name == "gender") {
				if (element.checked) user[element.name] = element.value;
			} else if(element.name == "admin"){
				user[element.name] = element.checked;
			} else {
				user[element.name] = element.value;
			}
		});

		if(!isValid) {
			this.btnSubmit.disabled = false;
			return false;
		}

		return new User(user.name, user.gender, user.birth, user.country, user.email, user.password, user.photo, user.admin);
	}

	selectAll() {
		let users = User.getUsersStorage();

			users.forEach(dataUser=>{
				let user = new User();

				user.loadFromJSON(dataUser);

				this.addLine(user);
		});
		
		
		
	}

	addLine(dataUser){//Adiciona uma nova linha na tabela
		
		let tr = this.getTr(dataUser);

		this.tableEl.appendChild(tr);

		this.updateCount();
	}

	getTr(dataUser, tr = null){//Elabora uma nova linha do Zero, criando a linha, adicionando todos os dados de usuário nos campos e no JSON, colocando também os eventos nos botões e depois retornando a Linha pronta para Uso.

		if (tr == null) tr = document.createElement("tr");

		tr.dataset.user = JSON.stringify(dataUser);

		tr.innerHTML = `
			<td><img src="${dataUser.photo}" alt="User Image" class="img-circle img-sm"></td>
			<td>${dataUser.name}</td>
			<td>${dataUser.email}</td>
			<td>${(dataUser.admin) ? 'Sim' : 'Não'}</td>
			<td>${Utils.dateFormat(dataUser.register)}</td>
			<td>
			  <button type="button" class="btn btn-primary btn-edit btn-xs btn-flat">Editar</button>
			  <button type="button" class="btn btn-danger btn-delete btn-xs btn-flat">Excluir</button>
			</td>
		`;

		this.addEventsTR(tr);

		return tr;
	}

	addEventsTR(tr) {
		//Clicando no botão Edita e carregando dados cadastrados dentro do menu de Update	
		tr.querySelector(".btn-edit").addEventListener("click", e=>{

			let json = JSON.parse(tr.dataset.user);

			this.formUpdateEl.dataset.trIndex = tr.sectionRowIndex;
			
			for (let property in json) {				
				let field = this.formUpdateEl.querySelector(`[name = ${property.replace("_", "")}]`);

				if(field) {

					switch (field.type) {
						case "file":
							continue;
						break;
						
						case "radio":
							field.querySelector("[name="+property.replace("_", "")+"][value="+json[property]+"]");
							field.checked = true;
						break;

						case "checkbox":
							field.checked = json[property];
						break;


						default:
							field.value = json[property];
					}					
				}	
				
			}

			this.formUpdateEl.querySelector(".photo").src = json._photo;

			this.showPanelUpdate();
		
		});

		//Excluindo uma Usuário
		tr.querySelector(".btn-delete").addEventListener("click", (e)=>{
			if(confirm("Deseja realmente Excluir?")) {

				let user = new User();

				user.loadFromJSON(JSON.parse(tr.dataset.user));

				user.remove();

				tr.remove();

				this.updateCount();
			}
		});
	}

	showPanelCreate(){
		document.querySelector("#box-user-create").style.display = "block";

		document.querySelector("#box-user-update").style.display = "none";
	}

	showPanelUpdate(){
		document.querySelector("#box-user-create").style.display = "none";

		document.querySelector("#box-user-update").style.display = "block";
	}

	updateCount(){
		let numberUsers = 0;
		let numberAdmin = 0;
		
		[...this.tableEl.children].forEach(tr=>{
			numberUsers++;
		
			let user = JSON.parse(tr.dataset.user)

			if(user._admin) numberAdmin++;
		});

		document.querySelector("#number-users").innerHTML = numberUsers;
		document.querySelector("#number-users-admin").innerHTML = numberAdmin;

	}









}